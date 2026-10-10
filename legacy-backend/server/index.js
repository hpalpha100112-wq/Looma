import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI, { toFile } from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const dataDir = path.resolve(process.env.DATA_DIR || './data');
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(dataDir, 'uploads'));
const generatedDir = path.join(uploadDir, 'generated');
for (const dir of [uploadDir, generatedDir]) fs.mkdirSync(dir, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

if (isProduction && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in production.');
}
if (!JWT_SECRET) {
  console.warn('WARNING: using an insecure development JWT secret. Set JWT_SECRET before deployment.');
}
const signingSecret = JWT_SECRET || 'local-development-secret-change-me-please';

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'blob:', 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"]
  } }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: 'draft-8', legacyHeaders: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait a little and try again.' } });
const generationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'You have reached the demo generation limit for this hour. Please try again later.' } });
const supportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many support requests. Please try again later.' } });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    cb(allowed.has(file.mimetype) ? null : new Error('Please upload a JPG, PNG, or WEBP image.'), allowed.has(file.mimetype));
  }
});

function apiError(res, status, message) { return res.status(status).json({ error: message }); }
function signToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, signingSecret, { expiresIn: '7d', issuer: 'looma-api', audience: 'looma-web' });
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return apiError(res, 401, 'Please sign in to continue.');
  try {
    const decoded = jwt.verify(token, signingSecret, { issuer: 'looma-api', audience: 'looma-web' });
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(Number(decoded.sub));
    if (!user) return apiError(res, 401, 'Your session is no longer valid. Please sign in again.');
    req.user = user;
    next();
  } catch {
    return apiError(res, 401, 'Your session has expired. Please sign in again.');
  }
}
function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}
function validDimensions(width, length) {
  return Number.isFinite(width) && Number.isFinite(length) && width >= 1 && length >= 1 && width <= 100 && length <= 100;
}
function extForMime(mime) {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[mime] || '.bin';
}
function verifyImageMagic(buffer, mime) {
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}
function publicProject(row) {
  return {
    id: row.id, name: row.name, roomType: row.room_type, width: row.width, length: row.length,
    budget: row.budget, style: row.style, styleKey: row.style_key, keepItems: row.keep_items,
    photoPath: row.photo_path, imagePath: row.image_path, brief: JSON.parse(row.brief_json || '{}'),
    favorite: Boolean(row.is_favorite), createdAt: row.created_at, updatedAt: row.updated_at
  };
}
function ownProject(req, res, next) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return apiError(res, 404, 'Project not found.');
  req.project = row;
  next();
}
function buildPrompt(brief, hasPhoto) {
  const room = cleanText(brief.roomType, 80) || 'living room';
  const style = cleanText(brief.style, 80) || 'Warm Modern';
  const budget = cleanText(brief.budget, 80) || 'not specified';
  const keep = cleanText(brief.keepItems, 600);
  const dims = `${Number(brief.width)} metres by ${Number(brief.length)} metres`;
  return [
    `Create one high-quality photorealistic interior design concept for a ${room}.`,
    hasPhoto
      ? 'Use the uploaded room photograph as the starting point. Preserve recognizable room architecture, window locations, walls and camera perspective where practical. Redesign finishes, furniture, lighting and decor rather than inventing an entirely unrelated space.'
      : 'Create a believable, well-proportioned interior with realistic furniture scale, practical walkways, natural-looking light and coherent material choices.',
    `Design direction: ${style}.`,
    `Approximate room dimensions: ${dims}. Keep the layout plausible for this size.`,
    `Budget preference: ${budget}. Reflect an appropriate level of finish; do not show price labels or text in the image.`,
    keep ? `User priorities to preserve where feasible: ${keep}.` : '',
    'Visual style: editorial architectural interior photography, thoughtful composition, natural materials, realistic lighting and shadows, refined but livable, no people, no watermark, no collage, no captions or typography.',
    'This is a visual concept, not a construction drawing. Do not claim exact measurements from the image.'
  ].filter(Boolean).join('\n');
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'looma-api', imageConfigured: Boolean(openai), timestamp: new Date().toISOString() }));

app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return apiError(res, 400, 'Enter a valid email address.');
    if (password.length < 10 || password.length > 128) return apiError(res, 400, 'Password must be 10–128 characters long.');
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return apiError(res, 409, 'An account with that email already exists.');
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ token: signToken(user), user });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) return apiError(res, 401, 'Email or password is incorrect.');
    return res.json({ token: signToken(user), user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/images/:filename', requireAuth, (req, res) => {
  const filename = String(req.params.filename || '');
  if (!/^[a-f0-9-]+\.png$/.test(filename)) return apiError(res, 400, 'Invalid image identifier.');
  const owned = db.prepare('SELECT filename FROM generated_images WHERE filename = ? AND user_id = ?').get(filename, req.user.id);
  if (!owned) return apiError(res, 404, 'Image not found.');
  const filePath = path.join(generatedDir, filename);
  if (!fs.existsSync(filePath)) return apiError(res, 404, 'Image file is no longer available.');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(filePath);
});

app.get('/api/projects', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ projects: rows.map(publicProject) });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const body = req.body || {};
  const name = cleanText(body.name, 70) || 'My room idea';
  const roomType = cleanText(body.roomType, 80) || 'Living room';
  const width = Number(body.width), length = Number(body.length);
  const budget = cleanText(body.budget, 80) || 'Just exploring';
  const style = cleanText(body.style, 80) || 'Warm Modern';
  const styleKey = cleanText(body.styleKey, 30) || 'warm';
  const keepItems = cleanText(body.keepItems, 600);
  const imagePath = typeof body.imagePath === 'string' && /^\/api\/images\/[a-f0-9-]+\.png$/.test(body.imagePath) ? body.imagePath : null;
  const photoPath = null; // Room uploads are processed in memory and are not retained by the server.
  if (!validDimensions(width, length)) return apiError(res, 400, 'Room width and length must be between 1 and 100 metres.');
  if (!imagePath) return apiError(res, 400, 'Generate a design before saving this project.');
  const id = crypto.randomUUID();
  const brief = { ...(body.brief && typeof body.brief === 'object' ? body.brief : {}), name, roomType, width, length, budget, style, styleKey, keepItems };
  db.prepare(`INSERT INTO projects (id,user_id,name,room_type,width,length,budget,style,style_key,keep_items,photo_path,image_path,brief_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, req.user.id, name, roomType, width, length, budget, style, styleKey, keepItems, photoPath, imagePath, JSON.stringify(brief));
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project: publicProject(row) });
});

app.get('/api/projects/:id', requireAuth, ownProject, (req, res) => res.json({ project: publicProject(req.project) }));

app.patch('/api/projects/:id', requireAuth, ownProject, (req, res) => {
  const favorite = req.body?.favorite;
  const name = req.body?.name;
  const fields = [];
  const params = [];
  if (typeof favorite === 'boolean') { fields.push('is_favorite = ?'); params.push(favorite ? 1 : 0); }
  if (typeof name === 'string' && cleanText(name, 70)) { fields.push('name = ?'); params.push(cleanText(name, 70)); }
  if (!fields.length) return apiError(res, 400, 'No supported project changes were supplied.');
  fields.push("updated_at = datetime('now')");
  params.push(req.project.id, req.user.id);
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.project.id, req.user.id);
  res.json({ project: publicProject(row) });
});

app.delete('/api/projects/:id', requireAuth, ownProject, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.project.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/ai/redesign', requireAuth, generationLimiter, upload.single('roomPhoto'), async (req, res, next) => {
  try {
    if (!openai) return apiError(res, 503, 'AI generation is not configured yet. Add OPENAI_API_KEY to the server environment and restart.');
    const brief = {
      name: cleanText(req.body.name, 70) || 'My room idea',
      roomType: cleanText(req.body.roomType, 80) || 'Living room',
      width: Number(req.body.width), length: Number(req.body.length),
      budget: cleanText(req.body.budget, 80) || 'Just exploring',
      style: cleanText(req.body.style, 80) || 'Warm Modern',
      styleKey: cleanText(req.body.styleKey, 30) || 'warm',
      keepItems: cleanText(req.body.keepItems, 600)
    };
    if (!validDimensions(brief.width, brief.length)) return apiError(res, 400, 'Room width and length must be between 1 and 100 metres.');
    if (req.file && !verifyImageMagic(req.file.buffer, req.file.mimetype)) return apiError(res, 400, 'The uploaded file does not appear to be a valid JPG, PNG, or WEBP image.');

    // Keep source photographs in memory only; the generated result is stored under an authenticated image route.

    const prompt = buildPrompt(brief, Boolean(req.file));
    let result;
    try {
      if (req.file) {
        const safeName = `room-photo${extForMime(req.file.mimetype)}`;
        result = await openai.images.edit({
          model: IMAGE_MODEL,
          image: await toFile(req.file.buffer, safeName, { type: req.file.mimetype }),
          prompt,
          size: '1024x1024',
          quality: 'medium'
        });
      } else {
        result = await openai.images.generate({ model: IMAGE_MODEL, prompt, size: '1024x1024', quality: 'medium', n: 1 });
      }
    } catch (error) {
      console.error('Image generation provider error:', error?.status || '', error?.message || 'Unknown provider error');
      if (error?.status === 401 || error?.status === 403) return apiError(res, 502, 'The image provider rejected the API credentials or account permissions. Check your server API key and model access.');
      if (error?.status === 429) return apiError(res, 429, 'The image provider is at its rate limit or your API quota is unavailable. Please try again later.');
      return apiError(res, 502, 'The AI image service could not generate this design. Check model access and try again.');
    }
    const base64 = result?.data?.[0]?.b64_json;
    if (!base64) return apiError(res, 502, 'The AI service returned no image. Please try again.');
    const imageBytes = Buffer.from(base64, 'base64');
    if (imageBytes.length < 1000 || imageBytes.length > 25 * 1024 * 1024) return apiError(res, 502, 'The AI service returned an invalid image. Please try again.');
    const fileName = `${crypto.randomUUID()}.png`;
    fs.writeFileSync(path.join(generatedDir, fileName), imageBytes, { flag: 'wx', mode: 0o600 });
    db.prepare('INSERT INTO generated_images (filename,user_id) VALUES (?,?)').run(fileName, req.user.id);
    return res.status(201).json({
      imagePath: `/api/images/${fileName}`,
      photoPath: null,
      model: IMAGE_MODEL,
      brief,
      disclaimer: 'AI-generated concept only. Confirm dimensions, feasibility, building requirements and local costs before implementation.'
    });
  } catch (error) { next(error); }
});

app.post('/api/support', supportLimiter, (req, res) => {
  const email = cleanText(req.body?.email, 254).toLowerCase();
  const topic = cleanText(req.body?.topic, 80) || 'Other';
  const subject = cleanText(req.body?.subject, 120);
  const message = cleanText(req.body?.message, 3000);
  if (!/^\S+@\S+\.\S+$/.test(email)) return apiError(res, 400, 'Enter a valid email address.');
  if (!subject) return apiError(res, 400, 'Enter a subject for your request.');
  if (message.length < 10) return apiError(res, 400, 'Please enter at least 10 characters in your message.');
  const ticketId = crypto.randomUUID().slice(0, 8).toUpperCase();
  db.prepare('INSERT INTO support_tickets (id,email,topic,subject,message) VALUES (?,?,?,?,?)').run(ticketId, email, topic, subject, message);
  return res.status(201).json({ ok: true, ticketId });
});

app.get('/api', (_req, res) => res.json({ service: 'Looma API', docs: 'See README.md for available endpoints.' }));
app.use(express.static(publicDir, { index: 'index.html', extensions: ['html'] }));
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return apiError(res, 404, 'API route not found.');
  res.sendFile(path.join(publicDir, 'index.html'), error => error && next(error));
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 8 MB or smaller.' : 'The uploaded image could not be accepted.';
    return apiError(res, 400, message);
  }
  if (err?.message?.includes('Please upload a JPG')) return apiError(res, 400, err.message);
  console.error('Unhandled server error:', err?.stack || err);
  return apiError(res, 500, 'Something went wrong on the server. Please try again.');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Looma running on http://localhost:${PORT}`);
  console.log(`Database: ${path.join(dataDir, 'looma.sqlite')}`);
  console.log(`AI image generation: ${openai ? `configured (${IMAGE_MODEL})` : 'not configured — set OPENAI_API_KEY'}`);
});

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
