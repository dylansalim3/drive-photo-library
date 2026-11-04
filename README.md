# Drive Photo Library

A phone-first, stream-only viewer for Google Drive photos and videos, built for
travel: upload from the phone while travelling, tag those uploads `not-sync`,
and download them in bulk later from a computer at home.

## The stream-only rule (do not break this)

The phone must never auto-download the library. This app has **no Google Photos
app, no Drive app sync, and no service worker that caches media** in v1.

- The grid shows **thumbnails only** (`/api/media/thumbnail`).
- A full image or video loads **only when you tap it**.
- Video uses `<video controls preload="metadata">` and streams through the
  server proxy with the Drive `Range` header passed through, so seeking does
  not download the whole file.
- Media responses are `Cache-Control: no-store`.
- Download-all does **not** zip media to the phone. It produces a JSON manifest
  of not-sync files with per-file download links, for bulk download from a
  computer at home. Single-file Download is an explicit tap.

## How the not-sync workflow works

- Uploads **through this web app** go into the Drive folder `Travel Inbox` and
  get the public Drive property `syncStatus = "not-sync"`. Public properties
  (not `appProperties`) are used so the tag is queryable, and the library
  filter uses the exact Drive query:

  `properties has { key='syncStatus' and value='not-sync' }`

- Photos and videos **batch-uploaded outside this app** (Drive desktop, Drive
  web, rclone, from your hard disk) do not get the tag and are not in the
  not-sync filter. They are already synced, so they need no tag.
- **Mark as synced** clears the not-sync tag (Drive property patched with
  `null`; fallback stores `syncStatus = "synced"`) and moves the file to the
  Drive folder `Travel Archive`.
- After a web upload is confirmed by Drive, the queue shows it as Confirmed.
  The browser cannot auto-delete the local original, so use that checklist
  before deleting local copies yourself to free phone space.

## UI: BoardUI only

Every button, input, tab, badge/chip, avatar, divider and file-upload element
in this app is a BoardUI component, copied as source (MIT) from
https://github.com/BoardUI/boardui into `src/components/` and `src/utils/`,
with BoardUI's `src/styles/globals.css`, `theme.css` and `typography.css`.
No other UI library is used (no MUI, shadcn, Untitled UI, etc.). Layout
`<div>`s use BoardUI semantic tokens only — no raw palette classes and no
hex literals in app code, per BoardUI's AGENTS.md rules.

Components copied and used:

- Buttons: `Button` (all actions, icons passed as Remix component references)
- Input: `Input` (login, search)
- Tabs: `Tabs`, `TabList`, `Tab` (All / Not-sync / Synced filter)
- Badges: `Chip` (sync status, upload queue status), `Badge` (available)
- Avatar: `Avatar` (header)
- Divider: `Divider`
- File upload: `FileUpload` (adapted — see below)
- Foundations: `DirectionProvider` (app root, `en-US`), `TemplateCopyProvider`
  support inside FileUpload
- Utils: `cx` (tailwind-merge aware of BoardUI type utilities)

One documented adaptation: BoardUI's `FileUpload` ships with a simulated
progress animation and is single-file only. The copy in this repo adds
`multiple` and `onFilesSelected` props: when they are used, selection is
handed straight to the app for a real, sequential upload queue — no simulated
progress and no “Uploaded successfully!” before Drive confirms. The
unmodified simulated path is not used by this app.

One documented exception: library grid tiles are native `<button>` elements
(semantic tap targets for a card containing a thumbnail, name, date and
status chip). Every *action* button in the app (Sign in, Refresh, Download,
Mark as synced, Close, Connect, Sign out) is a BoardUI `Button`.

## Stack

- Frontend: Vite + React + TypeScript, Tailwind CSS v4 via `@tailwindcss/vite`,
  `@/` alias pointing at `src/` (so BoardUI imports like `@/utils/cx` resolve).
- Backend: Cloudflare Pages Functions (free tier) under `functions/api/`.
- Storage: Cloudflare D1 (free tier) for sessions and encrypted Drive tokens
  only. Media itself lives in Google Drive; nothing is stored by this app.

## API contract (no fake data)

If the backend is not configured, the UI says so plainly and shows no sample
photos. Endpoints:

- `POST /api/auth/login` — simple app login (`APP_USER` / `APP_PASS`).
  Returns `NOT_CONFIGURED` (503) when those secrets are not set.
- `GET /api/auth/status` — `{ configured, authenticated, driveConnected, driveError? }`
- `POST /api/auth/logout` — clears the session cookie.
- `GET /api/auth/drive/connect` — starts server-side Google OAuth.
- `GET /api/auth/drive/callback` — OAuth callback, stores encrypted tokens.
- `GET /api/files?filter=all|not-sync|synced&search=` — Drive library list.
- `GET /api/media/thumbnail?id=` — thumbnail proxy, no-store.
- `GET /api/media/file?id=` — Range-passthrough stream proxy.
  Add `&download=1` for an explicit single-file download.
- `POST /api/upload` — one file per request (multipart), tagged not-sync,
  into Travel Inbox. The frontend queues files sequentially.
- `POST /api/files/:id/mark-synced` — clears the not-sync tag, moves to
  Travel Archive.
- `GET /api/download-manifest?filter=not-sync` — JSON manifest, no zip.

Authentication: the browser holds only an HttpOnly session cookie. Google
OAuth is server-side only: client ID/secret live only as Pages secrets,
Drive tokens are AES-GCM encrypted in D1 (key derived from
`GOOGLE_CLIENT_SECRET`, never stored in D1), and no Google token is shipped
in JavaScript. The Drive scope is the full `https://www.googleapis.com/auth/drive`
scope, because photos batch-uploaded outside this app must still be readable
here — `drive.file` alone only sees files the app itself created.

## Local development

```bash
npm install
npm run dev
```

`npm run build` runs `tsc -b` then `vite build` and must pass before any
push or deploy. The frontend talks to `/api/*` on the same origin, so full
Drive behaviour needs Pages Functions (see deploy steps) or a local proxy to
a deployed Functions backend; the login screen will otherwise report the
backend as not configured rather than faking a login.

## Setup Dylan still must do (before live Drive data appears)

Nothing below is recorded in this repo, and no secret value is ever committed.

1. **Google Cloud project**
   - Create a project, enable the **Google Drive API**.
   - Create an **OAuth client ID (Web application)** and register exactly
     this authorised redirect URI:
     `https://drive-photo-library.pages.dev/api/auth/drive/callback`
   - Keep the app in testing with yourself as a test user, or publish it,
     depending on your account setup — refresh tokens for a testing-mode app
     can expire, so check this if Drive disconnects after a while.
2. **Cloudflare Pages secrets** (Pages project `drive-photo-library`,
   production environment) — set, never commit:
   - `APP_USER`, `APP_PASS` — the simple login for this site.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from step 1.
   - Pages secrets only bind on a fresh deploy, so set them before deploying.
3. **D1 database** (free tier)
   - `wrangler d1 create drive-photo-library-db`
   - Replace the placeholder `database_id` in `wrangler.toml` with the real
     id that command returns, then apply migrations:
     `wrangler d1 migrations apply drive-photo-library-db`
4. **Deploy**
   - `npm run build`
   - `wrangler pages deploy dist --project-name drive-photo-library`
   - Then open the site, sign in with `APP_USER`, and tap
     **Connect Google Drive** to complete Google OAuth. The library appears
     only after that connection succeeds.

## Known v1 limits

- Upload goes through Pages Functions as one multipart POST per file. Very
  large videos can hit Functions request limits and will fail with a clear
  error (never a fake success); a resumable-upload path is a future v2 item.
- The not-sync list fetches up to 100 Drive files per query; pagination is a
  future item if a trip exceeds that.
- No service worker and no PWA install prompt in v1, deliberately, so no
  media can be cached offline by accident.
- No Google Photos integration, deliberately: the Photos Library API no
  longer lets an app read library items it did not upload, and it has no
  queryable custom tag like Drive properties.
