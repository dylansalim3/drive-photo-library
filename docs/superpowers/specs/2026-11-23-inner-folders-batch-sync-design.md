# Specification: Inner Folder Creation, Folder Uploads, Batch Upload & Batch Download

**Date**: 2026-11-23  
**Status**: Approved by User  
**Repository**: `drive-photo-library`  

---

## 1. Overview & Goals

This specification details the design for adding **inner folder creation**, **folder uploading**, **batch upload management**, and **batch downloading of not-sync media** to the Drive Photo Library application.

The core travel workflow remains stream-only (no auto-downloading of the entire library to phones, thumbnail-first grid, range-streamed video playback). This feature enhances the travel workflow by allowing trips to be partitioned into organized subfolders (e.g., `Day 1 - Tokyo`, `Beach Day`) in Google Drive while streamlining multi-file and multi-folder operations.

---

## 2. Google Drive Data Model & Folder Hierarchy

### 2.1 Hierarchy
Under the configured parent root folder (`1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb`):
```text
Travel Root (1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb)
├── Travel Inbox/                              <-- Incoming / not-sync parent
│   ├── [loose photo 1.jpg]                   <-- syncStatus="not-sync"
│   ├── [loose video 1.mp4]                   <-- syncStatus="not-sync"
│   └── Kyoto Day 1/                          <-- Subfolder (syncStatus="not-sync")
│       ├── IMG_001.jpg                       <-- syncStatus="not-sync"
│       └── IMG_002.jpg                       <-- syncStatus="not-sync"
└── Travel Archive/                            <-- Synced / finished parent
    └── Kyoto Day 1/                          <-- Moved here upon "Mark as synced"
        ├── IMG_001.jpg                       <-- syncStatus cleared
        └── IMG_002.jpg                       <-- syncStatus cleared
```

### 2.2 Drive Properties & Tagging Rules
* **Inner Folders**:
  * Created inside `Travel Inbox` with public Drive property `properties = { syncStatus: "not-sync" }`.
  * Allows querying subfolders alongside files in not-sync listings.
* **Nested Media Files**:
  * Uploaded into the specific subfolder (`parents: [subfolderId]`) with `properties = { syncStatus: "not-sync" }`.
* **Syncing a Folder**:
  * Marking a folder as synced clears `syncStatus` on the folder itself and its child files, then moves the folder from `Travel Inbox` to `Travel Archive`.

---

## 3. Backend API Contract (`functions/api/`)

### 3.1 `POST /api/folders` (New Endpoint)
Creates or finds an inner folder inside `Travel Inbox`.
* **Request Body (JSON)**:
  ```json
  { "name": "Kyoto Day 1", "parentId": "<optional-folder-id>" }
  ```
  *(If `parentId` is omitted, defaults to `Travel Inbox` id).*
* **Behavior**:
  * Finds or creates a folder with `name` inside the target parent.
  * Adds public property `{ syncStatus: "not-sync" }`.
* **Response (JSON)**:
  ```json
  { "ok": true, "folder": { "id": "1abc...", "name": "Kyoto Day 1", "parentId": "1inbox..." } }
  ```

### 3.2 `POST /api/upload` (Updated)
* **Request (Multipart Form Data)**:
  * `file`: Binary file.
  * `folderId` (optional): The ID of the target inner folder. Defaults to `Travel Inbox` if omitted.
* **Behavior**:
  * Sets `parents: [folderId ?? inboxId]`.
  * Sets `properties: { syncStatus: "not-sync" }`.
* **Response (JSON)**:
  ```json
  { "ok": true, "file": { "id": "...", "name": "...", ... } }
  ```

### 3.3 `GET /api/files` (Updated)
Supports hierarchical navigation.
* **Query Parameters**:
  * `filter`: `"all"` | `"not-sync"` | `"synced"` (default: `"not-sync"`)
  * `search`: string (optional)
  * `folderId`: string (optional, defaults to root of current filter)
* **Response (JSON)**:
  ```json
  {
    "currentFolderId": "1inbox...",
    "currentFolderName": "Travel Inbox",
    "breadcrumbs": [
      { "id": "root", "name": "Travel Inbox" }
    ],
    "subfolders": [
      { "id": "1sub...", "name": "Kyoto Day 1", "itemCount": 18, "syncStatus": "not-sync" }
    ],
    "files": [ ... ],
    "filter": "not-sync",
    "folderReady": true
  }
  ```

### 3.4 `POST /api/folders/:id/mark-synced` (New Endpoint)
* **Behavior**:
  * Finds or creates `Travel Archive`.
  * Clears `syncStatus` property on the folder and all child files inside it.
  * Moves the folder to `Travel Archive` (`addParents: archiveId`, `removeParents: inboxId`).
* **Response (JSON)**:
  ```json
  { "ok": true, "syncStatus": "synced", "movedCount": 19 }
  ```

---

## 4. Frontend UI & User Experience

### 4.1 Folder Upload & Manual Creation
* **Upload Controls**:
  * Primary drop zone supports both loose files and folder drag-and-drop.
  * Action buttons:
    * **"Upload Files"**: `<input type="file" multiple>` for loose photos/videos.
    * **"Upload Folder"**: `<input type="file" webkitdirectory multiple>` for choosing an entire folder.
    * **"+ New Folder"**: Opens a lightweight inline input to name and create a subfolder in `Travel Inbox`.
* **Auto-Folder Extraction**:
  * When a folder is dropped or selected via `webkitdirectory`, the frontend reads `file.webkitRelativePath` (e.g. `Kyoto Day 1/photo.jpg`).
  * The frontend extracts the top-level directory name (`Kyoto Day 1`).
  * Before file uploads begin, the app calls `POST /api/folders` once to get or create the folder ID, then queues all nested files with that `folderId`.

### 4.2 Batch Upload Engine
* **Sequential Queue**:
  * Files are uploaded sequentially to prevent memory pressure on mobile devices and Cloudflare Functions concurrency limits.
  * Batch summary header: **"Uploading 14 of 50 · 28% completed"**.
  * Each file item displays name, size, progress %, and status (`Queued` → `Uploading` → `Processing` → `Confirmed` or `Failed`).
  * Failed items feature a single-click "Retry" button.

### 4.3 Library Navigation & Breadcrumbs
* **Grid Layout**:
  * At the top of the grid: Subfolder cards rendered with BoardUI tokens, showing folder icon, name, file count, and `Not-sync`/`Synced` chip.
  * Below subfolder cards: Media thumbnail grid.
* **Breadcrumbs**:
  * When inside a subfolder, a breadcrumb header appears:
    `[Travel Inbox] > [Kyoto Day 1]`
  * Tapping `Travel Inbox` returns to the root view.

### 4.4 Batch Download Engine
* **In-Browser Paced Batch Download**:
  * Available on the **Not-sync** tab and inside any subfolder containing not-sync files.
  * Button: **"Batch download (X files)"**.
  * When triggered, sequentially triggers browser downloads using hidden anchor tags with `/api/media/file?id=...&download=1` paced at 250ms intervals.
  * Displays a live progress banner: **"Downloading 12 of 30 files..."** with a "Cancel" option.
* **Home Bulk-Download Companion Script**:
  * Maintains the JSON manifest (`/api/download-manifest`) and adds a copyable one-liner PowerShell / curl snippet so home computers can perform unattended parallel downloads into a local folder.

---

## 5. Error Handling & Edge Cases

1. **Duplicate Folder Names**:
   * If a folder with the same name already exists inside `Travel Inbox`, `POST /api/folders` reuses the existing folder ID rather than duplicating it.
2. **Empty Folders**:
   * Allowed via "+ New Folder". Displayed in the library with "0 items".
3. **Network Interruption During Batch Upload**:
   * Successfully confirmed files remain in Drive. Interrupted files are marked `Failed` with a "Retry" button; the rest of the queue pauses safely.
4. **Browser Download Throttling During Batch Download**:
   * Browsers may ask for permission to download multiple files ("Allow site to download multiple files?"). The UI provides a brief tip explaining this prompt.

---

## 6. Verification & Testing Plan

1. **TypeScript & Build**:
   * Run `npm run build` (`tsc -b && vite build`) to verify all types and components compile cleanly.
2. **Unit / Integration Flows**:
   * Verify folder creation returns correct IDs and sets `properties.syncStatus = 'not-sync'`.
   * Verify folder upload via `webkitdirectory` extracts folder name and routes child files into that subfolder.
   * Verify breadcrumb navigation drills down into subfolder and returns to root.
   * Verify batch download triggers downloads for all not-sync items in the current view.
   * Verify "Mark folder as synced" moves the entire folder to `Travel Archive`.
