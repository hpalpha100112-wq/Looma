# Looma — AI Interior Studio (multi-page deployable MVP)

Looma is a responsive, hash-routed website with a Node.js/Express backend. This package includes distinct pages, page-specific interactions, user accounts, private AI image delivery, saved projects, and a server-backed support request form.

## Pages and navigation

The site uses client-side hash routes served from one deployable HTML entrypoint. Links open their related page rather than all opening the same modal.

- `#/home` — marketing homepage and homepage section navigation.
- `#/explore` — searchable/filterable interior style library. “Explore” takes a selected look into the Studio.
- `#/templates` — searchable room templates and starter briefs. Each “Use template” pre-fills a different room/style/dimension/budget brief.
- `#/studio` — standalone design workspace with room type, dimensions, budget, style, must-keep notes, optional photo upload, AI generation, visual result, reference comparison, exportable brief and save action.
- `#/projects` — the signed-in user's private project library, with search and unique project links.
- `#/projects/:id` — individual project detail page with the saved image, brief, dimensions, budget band, favorite toggle, rename and delete controls. Sample routes `#/projects/sample-sunday-living-room` and `#/projects/sample-quiet-bedroom` are public examples.
- `#/community` — design prompts users can join/leave locally, with actions into Explore, Studio and Projects.
- `#/pricing` — separate pricing/plans page; paid checkout is not connected and prices are clearly labelled illustrative.
- `#/account` — registration, sign-in and signed-in account view/sign-out.
- `#/support` — FAQ accordions and a backend-stored support request form.

The Explore and Templates pages have working search/filter controls. The Studio supports actual image-model requests when configured, and saved-project actions open their own detail routes. Community prompt membership is stored in that browser. Support form requests are stored on the configured app server. No billing integration or public community feed is included.

## What is implemented

- Responsive home, Explore, Templates, Studio, Projects, Project Details, Community, Pricing, Account and Support pages.
- Email/password registration and sign-in using bcrypt password hashing and signed JWT sessions.
- SQLite-backed users, projects and support tickets.
- Authenticated project create/list/open/update-favourite/rename/delete API.
- Image-to-image redesign when a room photo is uploaded; text-to-image generation without a photo.
- Private generated-image access (only the owner can fetch an image with a bearer token).
- Image upload validation, generation and support rate limits, security headers, request size limits and health endpoint.
- Exportable room/design brief (`.txt`); project search, favorites, rename, deletion, comparison reference, and private image delivery.
- Render Blueprint and Dockerfile.

## Important limitations

This is a deployable MVP foundation, not an enterprise production system. It is not a true CAD or editable 2D/3D floorplan engine. Furniture retailer/catalog integrations, accurate product pricing, real-time collaboration, payments, BIM/IFC, AR/VR, professional construction estimating, password reset, email verification and an admin support-ticket console are not implemented. Generated interiors are visual concepts, not construction plans. Confirm dimensions, feasibility, codes and costs with qualified local professionals.

The Pricing page shows illustrative plan concepts only. It does not collect payment. Community prompts are browser-local examples and are not a public social feed. Support requests are stored in SQLite; add an authorised admin view or ticketing integration and define retention/access policies before public use.

Real image generation requires an OpenAI API key with image-model access and sufficient account quota. The default is `gpt-image-1-mini`; set `OPENAI_IMAGE_MODEL=gpt-image-2` if it is enabled for your API account. Model availability and pricing may change. Image requests can incur provider charges. Review the current [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation) before launch.

## Requirements

- Node.js 20 or later (Node 22 LTS recommended).
- npm.
- OpenAI API key for real AI generation. The rest of the website can load without the key, but the generation endpoint will report that it is not configured.

## Run locally on macOS, Windows or Linux

1. Extract the ZIP and open a terminal inside `looma-deploy-ready/`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env`. Set a long random `JWT_SECRET` and your server-side `OPENAI_API_KEY`. Generate a secret with:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000`.

For development with restart-on-change, use `npm run dev`. Run `npm run check` to validate JavaScript syntax.

## API overview

Routes use the same origin and `/api` prefix.

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | Service status and AI configuration state |
| POST | `/api/auth/register` | No | Create account; JSON `{ "email": "...", "password": "10+ characters" }` |
| POST | `/api/auth/login` | No | Sign in; returns JWT and user |
| GET | `/api/auth/me` | Yes | Current account |
| GET | `/api/projects` | Yes | List owned projects |
| POST | `/api/projects` | Yes | Save a generated design project |
| GET | `/api/projects/:id` | Yes | Open one owned project |
| PATCH | `/api/projects/:id` | Yes | Rename project and/or toggle favorite |
| DELETE | `/api/projects/:id` | Yes | Delete one owned project |
| GET | `/api/images/:filename` | Yes | Stream a generated image to its owner |
| POST | `/api/ai/redesign` | Yes | Generate or edit a room image using multipart form data and optional `roomPhoto` |
| POST | `/api/support` | No | Validate and store a support ticket; rate limited |

Pass the session token as `Authorization: Bearer <token>`. The frontend manages this automatically. Support submissions receive a short ticket identifier; this starter does not include an admin ticket reader or outbound email notification.

## Deploy to Render (single app instance)

1. Put the project folder in a private Git repository and push it to your Git provider.
2. In Render, create a Blueprint from that repository; review `render.yaml`.
3. Set `OPENAI_API_KEY` in the service environment settings. `JWT_SECRET` is generated by the Blueprint.
4. Deploy and check `/api/health`.
5. Register a test user, navigate through all pages, save a test project, reload its project-detail route, and test the support form. Verify the AI generation quota and monitor spend/logs.

SQLite and generated-image storage use the Render persistent disk configured in `render.yaml`. This setup is for a **single app instance**; do not horizontally scale multiple instances sharing local SQLite. For higher traffic, migrate accounts/projects/support tickets to managed PostgreSQL, move generated assets to private object storage, add image/ticket retention policies, stronger monitoring, email verification and password-reset workflows, and publish privacy/terms pages before public launch.

## Deploy with Docker

```bash
docker build -t looma-interior-studio .
docker run --rm -p 3000:3000 \
  -e JWT_SECRET="replace-with-a-long-random-secret" \
  -e OPENAI_API_KEY="your-key" \
  -e DATA_DIR=/var/data \
  -v looma-data:/var/data \
  looma-interior-studio
```

Then open `http://localhost:3000`.

## Environment variables

| Variable | Required? | Description |
|---|---|---|
| `JWT_SECRET` | Required in production | Random secret, at least 32 characters |
| `OPENAI_API_KEY` | For real AI | Server-side image API key; never put it in public JavaScript |
| `OPENAI_IMAGE_MODEL` | Optional | Defaults to `gpt-image-1-mini` |
| `PORT` | Optional | Defaults to `3000` |
| `NODE_ENV` | Optional | Set to `production` for deployment |
| `DATA_DIR` | Optional | Defaults to `./data`; use persistent disk path in production |
| `UPLOAD_DIR` | Optional | Defaults to `${DATA_DIR}/uploads` |
| `TRUST_PROXY` | Optional | Set to `1` only behind a trusted single reverse proxy; Render config sets this |

## Security and operating notes

- Never commit `.env`, API keys, account databases, generated content, or uploaded content.
- AI generation requires sign-in and is rate limited. Account routes use password hashes, bearer tokens, validation and request limits.
- Source photographs are processed in memory by the Looma server and sent to the configured image provider for editing; the source photo is not retained by the server. Generated images are stored on server disk and are private to the owning account through the authenticated image endpoint.
- Support requests contain contact details and messages. Restrict access to the database and define retention/deletion rules. Add an authorised admin/ticket provider before using it as a public support channel.
- The server does not send support-email notifications; tickets are stored in SQLite. Confirm deployment storage persistence and backup settings.
- Keep provider API keys and JWT secrets server-side. The demo generation limit is 5 requests per user/IP limit window as configured in the backend.
