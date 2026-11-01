# Looma — AI Interior Studio

Looma is a responsive interior design studio with a Vercel static frontend and small serverless AI endpoints.

## Deploy on Vercel

1. Import `hpalpha100112-wq/Looma` or use the existing `looma` project.
2. Keep the Framework Preset set to **Other**. The root `index.html` remains the site entry point; Vercel also discovers functions in `api/`.
3. In **Project → Settings → Environment Variables**, add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_IMAGE_MODEL` for the environments you use. Values are server-side only. Do not add an API key to frontend variables or commit it.
4. Redeploy after setting variables.

The AI routes return a clear setup message when their required variables are missing. No API key is included in this repository.

## AI endpoints

- `POST /api/ai/chat` uses the OpenAI Responses API for interior-design conversation, optional image understanding, and validated structured design specifications.
- `POST /api/ai/generate` creates or transforms a room concept image using the configured image model.
- Both routes validate request size and image format, send `store: false` for Responses, bound output and request sizes, and return provider failures without fabricated results.

The Studio keeps the conversation and structured design context in session storage for the current browser tab. Saved project data, including structured specifications, remains in this browser's local storage. Uploaded photos remain in memory until the user submits an AI request. Generated images can be previewed or downloaded. There is no remote database, user authentication, or private object storage in this version, so images are not saved to cloud storage and project ownership checks are not available. `lib/furniture.js` defines a validated future catalog record contract without adding sample inventory.

## Local checks

Requires Node.js 22 or newer.

```sh
npm install
npm run check
```

## Production security follow-up

The AI routes currently use a best-effort in-memory per-IP limiter. Vercel can run multiple function instances, so this is not a durable quota or abuse-prevention system. Before enabling broad public use, add authentication and a shared rate-limit/usage store, then connect owned projects and private image storage. No database migration is required for this foundation.
