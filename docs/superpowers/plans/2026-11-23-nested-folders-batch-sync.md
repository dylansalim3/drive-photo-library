# Nested Folders, Batch Upload & Batch Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable nested multi-level folder creation, folder uploading, sequential batch upload queue, in-browser batch download, and breadcrumb library navigation in Google Drive Photo Library.

**Architecture:** Backend Cloudflare Pages Functions handle recursive folder path resolution/creation in Google Drive (`POST /api/folders`), hierarchical folder + file listings with breadcrumbs (`GET /api/files`), and recursive folder syncing (`POST /api/folders/:id/mark-synced`). The frontend (React + BoardUI) provides folder picking via `webkitdirectory`, sequential batch upload with overall progress, folder card navigation with interactive breadcrumbs, and paced batch download.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, BoardUI components & design tokens, Cloudflare Pages Functions, Google Drive API v3.

---

### Task 1: Backend Drive Helper & Data Types for Nested Folders

**Files:**
- Modify: `functions/_lib/types.ts`
- Modify: `functions/_lib/drive.ts`

- [ ] **Step 1: Update type definitions in `functions/_lib/types.ts`**

Add `DriveFolderOut`, `Breadcrumb`, and extended `FilesResponse` types:

```typescript
export interface Breadcrumb {
  id: string;
  name: string;
}

export interface DriveFolderOut {
  id: string;
  name: string;
  parentId?: string;
  itemCount?: number;
  syncStatus: "not-sync" | "synced" | "unknown";
}
```

- [ ] **Step 2: Add nested path resolution and folder listing in `functions/_lib/drive.ts`**

Implement:
1. `resolveNestedFolderPath(env: Env, path: string, rootParentId?: string): Promise<{ id: string; name: string; parentId: string; path: string } | null>`:
   Splits `path` on `/`, finds or creates each folder segment in order, setting `syncStatus: "not-sync"` on newly created folders, and returns the leaf folder.
2. `listSubfolders(env: Env, parentId: string): Promise<DriveFolderOut[] | null>`:
   Queries Drive for folders whose `parents` include `parentId` and `trashed = false`.
3. `getBreadcrumbs(env: Env, folderId: string, rootFolderId: string): Promise<Breadcrumb[]>`:
   Walks up `parents` to construct the breadcrumb trail back to `rootFolderId`.
4. `syncFolderRecursive(env: Env, folderId: string, archiveParentId: string): Promise<number>`:
   Recursively patches `syncStatus: null` on all subfolders and media files inside `folderId`, and moves the root subfolder into `archiveParentId`.

- [ ] **Step 3: Run TypeScript check to verify types compile**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 4: Commit changes**

```bash
git add functions/_lib/types.ts functions/_lib/drive.ts
git commit -m "feat(backend): add nested folder resolution, listing, and recursive sync helpers"
```

---

### Task 2: Backend API: `POST /api/folders` for Nested Path Resolution

**Files:**
- Create: `functions/api/folders.ts`

- [ ] **Step 1: Implement `POST /api/folders`**

Create `functions/api/folders.ts` to handle:
1. Require active session via `requireSession(context)`.
2. Parse JSON body `{ name?: string; path?: string; parentId?: string }`.
3. If `path` is passed (e.g. `"Japan 2026/Tokyo/Day 1"`), use `resolveNestedFolderPath`.
4. If single `name` is passed, resolve or create directly inside `parentId` (defaulting to `Travel Inbox`).
5. Ensure newly created folders are tagged `{ syncStatus: "not-sync" }`.
6. Return `{ ok: true, folder: { id, name, parentId, path } }`.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 3: Commit**

```bash
git add functions/api/folders.ts
git commit -m "feat(backend): add POST /api/folders for nested folder creation"
```

---

### Task 3: Backend API: Update `GET /api/files` for Hierarchical Browsing & Breadcrumbs

**Files:**
- Modify: `functions/api/files.ts`

- [ ] **Step 1: Update `GET /api/files` to accept `folderId` parameter**

1. Parse `url.searchParams.get("folderId")`.
2. If `folderId` is provided, list subfolders and files within that specific folder.
3. If `folderId` is omitted, list the root level for the current filter (e.g. `Travel Inbox` for `not-sync`, `Travel Archive` for `synced`).
4. Generate breadcrumb trail from the current folder up to the root folder.
5. Return JSON payload:
   ```json
   {
     "currentFolderId": string,
     "currentFolderName": string,
     "breadcrumbs": Breadcrumb[],
     "subfolders": DriveFolderOut[],
     "files": DriveFileOut[],
     "filter": string,
     "folderReady": boolean
   }
   ```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 3: Commit**

```bash
git add functions/api/files.ts
git commit -m "feat(backend): support folderId and breadcrumbs in GET /api/files"
```

---

### Task 4: Backend API: Update `POST /api/upload` to Support `folderId` & `folderPath`

**Files:**
- Modify: `functions/api/upload.ts`

- [ ] **Step 1: Update `POST /api/upload` to accept target folder**

1. Check for `folderId` or `folderPath` in form data.
2. If `folderPath` is passed (e.g. `Japan 2026/Tokyo`), resolve the leaf folder ID via `resolveNestedFolderPath`.
3. If `folderId` is passed, use it directly.
4. If neither is passed, default to `Travel Inbox` ID.
5. Upload the file to Google Drive with `parents: [targetFolderId]` and `properties: { syncStatus: "not-sync" }`.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 3: Commit**

```bash
git add functions/api/upload.ts
git commit -m "feat(backend): accept target folderId or folderPath in POST /api/upload"
```

---

### Task 5: Backend API: `POST /api/folders/[id]/mark-synced` for Recursive Folder Syncing

**Files:**
- Create: `functions/api/folders/[id]/mark-synced.ts`

- [ ] **Step 1: Implement `POST /api/folders/[id]/mark-synced`**

1. Require active session via `requireSession(context)`.
2. Extract folder `id` from `context.params["id"]`.
3. Locate or create `Travel Archive` folder in the root parent directory.
4. Invoke `syncFolderRecursive(env, id, archiveId)`.
5. Return `{ ok: true, syncStatus: "synced", movedCount }`.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 3: Commit**

```bash
git add functions/api/folders/[id]/mark-synced.ts
git commit -m "feat(backend): add recursive folder sync endpoint POST /api/folders/:id/mark-synced"
```

---

### Task 6: Frontend API Client & Types (`src/api.ts`)

**Files:**
- Modify: `src/api.ts`

- [ ] **Step 1: Add frontend interfaces and API helper methods**

1. Define `DriveFolder`:
   ```typescript
   export interface Breadcrumb {
     id: string;
     name: string;
   }
   export interface DriveFolder {
     id: string;
     name: string;
     parentId?: string;
     itemCount?: number;
     syncStatus: "not-sync" | "synced" | "unknown";
   }
   ```
2. Update `FilesResponse`:
   ```typescript
   export interface FilesResponse {
     currentFolderId: string;
     currentFolderName: string;
     breadcrumbs: Breadcrumb[];
     subfolders: DriveFolder[];
     files: DriveFile[];
     filter: Filter;
     inboxFolder: string;
     archiveFolder: string;
     folderReady: boolean;
   }
   ```
3. Add API functions:
   - `createFolder(nameOrPath: string, parentId?: string): Promise<{ ok: boolean; folder: DriveFolder }>`
   - `markFolderSynced(id: string): Promise<{ ok: boolean; syncStatus: string; movedCount: number }>`
   - Update `listFiles(filter: Filter, search: string, folderId?: string): Promise<FilesResponse>`
   - Update `uploadFile(file: File, onProgress: ..., folderId?: string): Promise<{ ok: boolean; file: DriveFile }>`

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`  
Expected: Clean pass.

- [ ] **Step 3: Commit**

```bash
git add src/api.ts
git commit -m "feat(frontend): add folder types and API methods in src/api.ts"
```

---

### Task 7: Frontend Batch Upload & Folder Drag-and-Drop Selection

**Files:**
- Modify: `src/components/base/file-upload/file-upload.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Enhance `FileUpload` component with folder upload button and directory support**

1. Add folder upload input with `webkitdirectory=""` and `directory=""` attributes.
2. Provide two triggers: "Upload files" and "Upload folder".
3. When files or folders are dropped or picked, pass along relative paths (`file.webkitRelativePath`).

- [ ] **Step 2: Implement folder path caching & sequential batch upload engine in `src/App.tsx`**

1. Add `folderPath?: string` and `targetFolderId?: string` to `QueueItem`.
2. When a batch is dropped/selected:
   - Identify unique folder paths (e.g. `Kyoto/Day 1`).
   - Sequentially resolve or create each folder via `createFolder(folderPath, currentFolderId)`.
   - Queue files with their resolved `targetFolderId`.
3. Update the batch upload queue display:
   - Overall progress header: **"Uploading 12 of 45 files (27%) · 3 confirmed"**.
   - Show relative folder path under each file name.
   - Retry action on failed items.

- [ ] **Step 3: Add "+ New folder" modal / inline prompt**

1. Add a "+ New folder" BoardUI button.
2. Input dialog/prompt to enter the folder name.
3. Calls `createFolder` with `currentFolderId` and immediately refreshes the library view.

- [ ] **Step 4: Run build check**

Run: `npm run build`  
Expected: Clean pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/base/file-upload/file-upload.tsx src/App.tsx
git commit -m "feat(frontend): add folder upload, new folder creation, and batch upload queue"
```

---

### Task 8: Frontend Breadcrumb Navigation & Subfolder Cards

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add interactive breadcrumbs in `src/App.tsx`**

1. Render breadcrumbs above the library grid:
   `Travel Inbox > Japan 2026 > Tokyo > Day 1`
2. Each ancestor crumb is a clickable button that sets `currentFolderId` to that folder's ID.
3. Root crumb switches dynamically with the active filter tab (`Travel Inbox` for Not-sync, `Travel Archive` for Synced).

- [ ] **Step 2: Render subfolder cards in the library grid**

1. When `subfolders.length > 0`, render folder cards at the top of the grid.
2. Each folder card includes:
   - Folder icon (`RiFolderLine`)
   - Folder name
   - File count badge
   - Sync status Chip (`Not-sync` or `Synced`)
   - "Mark as synced" button on folder hover/context
3. Clicking a folder card drills down into that folder (`setCurrentFolderId(folder.id)`).

- [ ] **Step 3: Run build check**

Run: `npm run build`  
Expected: Clean pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(frontend): add folder cards and dynamic breadcrumb navigation"
```

---

### Task 9: Frontend Paced Batch Download Engine

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement client-side paced batch download**

1. Add a prominent **"Batch download (X files)"** button on the Not-sync tab and inside any subfolder containing not-sync files.
2. When clicked:
   - Collects all not-sync files in the current folder (and nested subfolders).
   - Iterates through the list, triggering downloads via `/api/media/file?id=...&download=1` paced with a 250ms interval between triggers.
   - Shows live progress banner: **"Downloading 14 of 42 files..."** with a "Cancel" button.
3. Also support **"Mark folder as synced"** button to archive the current folder.

- [ ] **Step 2: Update download manifest generation**

1. Include `folderPath` for each entry in `drive-not-sync-manifest.json` so home scripts can recreate the nested directory structure on disk.

- [ ] **Step 3: Run build check**

Run: `npm run build`  
Expected: Clean pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(frontend): add paced batch download and folder-aware manifest"
```

---

### Task 10: Build & Deployment Verification

**Files:**
- Entire repository

- [ ] **Step 1: Execute full TypeScript and Vite build**

Run: `npm run build`  
Expected: Zero compilation or bundling errors.

- [ ] **Step 2: Deploy to Cloudflare Pages**

Run: `npx wrangler pages deploy dist --project-name drive-photo-library`  
Expected: Successful deployment to `drive-photo-library.pages.dev`.

- [ ] **Step 3: Verify live endpoints**

Verify `https://drive-photo-library.pages.dev/api/auth/status` returns `configured: true`.
