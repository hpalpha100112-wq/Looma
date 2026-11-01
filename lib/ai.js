import OpenAI from "openai";

export const MAX_PHOTO_BYTES = 2_500_000;
const MAX_DATA_URL_CHARS = Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 128;
let client;

export const DESIGNER_INSTRUCTIONS = `You are Looma, an experienced interior architect and interior designer. Give practical, specific advice tied to the user's room, constraints, style, budget, and stated preferences. Support modern, minimalist, Japandi, Scandinavian, contemporary, industrial, Mediterranean, traditional Indian, contemporary Indian, luxury, and other styles.

Respect the architecture visible in photos. Identify doors, windows, fixed elements, furniture, materials, and lighting only when visible. A photograph cannot establish exact room dimensions: never infer or invent measurements. Distinguish visual observations from assumptions. Do not suggest blocking doors, windows, circulation, or access. Recommend furniture sizes only when dimensions are known, and label estimates as estimates. Never fabricate product inventory, prices, measurements, or 3D coordinates. Ask concise questions when an important constraint is missing. Keep generated images independent from measured geometry.

Return a concise conversational reply and a complete structured design object. The design object is a concept specification, not a measured floor plan. Use empty arrays for categories with no useful recommendation. Use valid six-digit hex colors. Put uncertainty and missing measurements in the appropriate fields.`;

export const DESIGN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message", "design"],
  properties: {
    message: { type: "string" },
    design: {
      type: "object",
      additionalProperties: false,
      required: ["roomType", "designStyle", "designSummary", "colorPalette", "materials", "furnitureSuggestions", "lightingSuggestions", "designRecommendations", "missingInformation", "confidenceNotes"],
      properties: {
        roomType: { type: "string" },
        designStyle: { type: "string" },
        designSummary: { type: "string" },
        colorPalette: {
          type: "object",
          additionalProperties: false,
          required: ["primary", "secondary", "accent"],
          properties: {
            primary: { type: "string" },
            secondary: { type: "string" },
            accent: { type: "string" }
          }
        },
        materials: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "category", "reason"],
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              reason: { type: "string" }
            }
          }
        },
        furnitureSuggestions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "category", "suggestedPosition", "sizeGuidance"],
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              suggestedPosition: { type: "string" },
              sizeGuidance: { type: "string" }
            }
          }
        },
        lightingSuggestions: { type: "array", items: { type: "string" } },
        designRecommendations: { type: "array", items: { type: "string" } },
        missingInformation: { type: "array", items: { type: "string" } },
        confidenceNotes: { type: "array", items: { type: "string" } }
      }
    }
  }
};

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("Looma AI is not configured yet. Add OPENAI_API_KEY and OPENAI_MODEL in Vercel Environment Variables.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  if (!process.env.OPENAI_MODEL) {
    const error = new Error("Looma AI is not configured yet. Add OPENAI_MODEL in Vercel Environment Variables.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  client ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
  return client;
}

export function validatePhotoDataUrl(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > MAX_DATA_URL_CHARS) throw new Error("Room photos must be 2.5 MB or smaller.");
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("Use a JPG, PNG, or WEBP room photo.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("Room photos must be 2.5 MB or smaller.");
  const valid = match[1] === "image/png"
    ? bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
      : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("The selected file does not match its image format.");
  return { dataUrl: value, mimeType: match[1], bytes };
}

export function validateDesign(value) {
  if (!value || typeof value !== "object" || typeof value.message !== "string" || !value.design || typeof value.design !== "object") return false;
  const d = value.design;
  const textFields = ["roomType", "designStyle", "designSummary"];
  if (textFields.some((key) => typeof d[key] !== "string")) return false;
  if (!d.colorPalette || ["primary", "secondary", "accent"].some((key) => !/^#[0-9a-f]{6}$/i.test(d.colorPalette[key] || ""))) return false;
  const arrays = ["materials", "furnitureSuggestions", "lightingSuggestions", "designRecommendations", "missingInformation", "confidenceNotes"];
  if (arrays.some((key) => !Array.isArray(d[key]))) return false;
  return d.materials.every((item) => item && ["name", "category", "reason"].every((key) => typeof item[key] === "string"))
    && d.furnitureSuggestions.every((item) => item && ["name", "category", "suggestedPosition", "sizeGuidance"].every((key) => typeof item[key] === "string"))
    && ["lightingSuggestions", "designRecommendations", "missingInformation", "confidenceNotes"].every((key) => d[key].every((item) => typeof item === "string"));
}

export function setCommonHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

const windows = new Map();
export function allowRequest(req, res, limit = 12) {
  const now = Date.now();
  const address = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const prior = windows.get(address) || [];
  const recent = prior.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= limit) {
    res.setHeader("Retry-After", "3600");
    res.status(429).json({ error: "Too many AI requests from this network. Please try again later." });
    return false;
  }
  recent.push(now);
  windows.set(address, recent);
  if (windows.size > 2_000) {
    for (const [key, timestamps] of windows) if (!timestamps.some((timestamp) => now - timestamp < 60 * 60 * 1000)) windows.delete(key);
  }
  return true;
}

export function sendApiError(res, error) {
  if (error?.code === "AI_NOT_CONFIGURED") {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  if (error?.status === 429) {
    res.status(429).json({ error: "The AI provider is busy or the project has reached its usage limit. Please try again shortly." });
    return;
  }
  console.error("Looma AI request failed:", error?.message || error);
  res.status(502).json({ error: "Looma could not complete that request. Please retry in a moment." });
}
