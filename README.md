# Looma — AI Interior Studio

Looma is a responsive, multi-page interior-design **frontend** configured for static deployment on Vercel.

## Deploy on Vercel

1. Open the [Looma GitHub repository](https://github.com/hpalpha100112-wq/Looma).
2. In Vercel, import this repository or open the existing `looma` project.
3. Set **Framework Preset** to **Other** (no framework).
4. Leave **Build Command** empty and set **Output Directory** to `.` (repository root).
5. Deploy the `main` branch.

The homepage and all bundled CSS/JavaScript are in the root `index.html`. Page navigation uses hash routes, so pages such as Explore, Templates, Studio, Projects, Community, Pricing, Account and Support are handled in the browser.

## What works in the static version

- Separate page views with page-specific navigation and actions.
- Searchable style and room-template libraries.
- Room brief with dimensions, budget, style and notes.
- Sample concept illustrations and comparison.
- Save, rename and delete local project drafts.
- Export a room brief as a text file.
- Local demo profile and feedback draft.

Project drafts and profile details are stored in the browser that created them. They do not sync across devices. The concept images are sample illustrations; the uploaded room photo is not sent to an AI provider. Login, cloud storage, live AI image generation, billing, and remote support submission are not connected in this static version.

## Legacy backend archive

The previous Express/SQLite implementation is preserved under `legacy-backend/`. It writes a SQLite database and generated images to local disk and is **not used by the root Vercel deployment**. Do not restore it as a Vercel function without migrating persistence to managed services. Its original instructions are in `legacy-backend/README.md`.

For a production AI product, add a serverless API with secrets stored in Vercel Environment Variables, plus a managed database and object storage. Never commit API keys, passwords, or real `.env` files.
