# Legacy Looma Express backend

This folder preserves the original Express/SQLite implementation and its matching frontend for reference.

## Important

This legacy backend is **not used by the Vercel deployment at the repository root**. It writes SQLite and generated images to local directories. Vercel serverless functions do not provide durable shared filesystem storage, so this version should not be re-enabled on Vercel as-is.

Use the root `index.html` for the current Vercel-ready static Looma experience. In that version, room concepts are sample illustrations and project drafts are stored in the visitor's browser.

## Running this legacy version

From this folder, with Node.js 20+ installed:

```bash
npm install
cp .env.example .env
# Set JWT_SECRET; add OPENAI_API_KEY if you want real image generation.
npm start
```

The app uses SQLite and generated-image files on disk. For a durable public deployment of this backend, use a host with persistent storage (such as the provided Render/Docker setup) or migrate its data/images to managed database and object storage before adapting the endpoints to Vercel Functions.

Never commit real `.env` values or API keys.
