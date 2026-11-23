# Specification: Nested Folder Creation, Folder Uploads, Batch Upload & Batch Download

**Date**: 2026-11-23  
**Status**: Approved by User  
**Repository**: `drive-photo-library`  

---

## 1. Overview & Goals

This specification details the design for adding **nested multi-level folder creation**, **nested folder uploading**, **batch upload management**, and **batch downloading of not-sync media** to the Drive Photo Library application.

The core travel workflow remains stream-only (no auto-downloading of the entire library to phones, thumbnail-first grid, range-streamed video playback). This feature enables deep organization for trips (e.g., `Japan 2026 / Tokyo / Day 1` or `Beach Trip / Camera / RAW`) while streamlining multi-file and multi-folder operations.

---

## 2. Google Drive Data Model & Nested Folder Hierarchy

### 2.1 Hierarchy & Arbitrary Nesting
Under the configured parent root folder (`1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb`):
```text
Travel Root (1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb)
├── Travel Inbox/                              <-- Incoming / not-sync parent
│   ├── [loose photo 1.jpg]                   <-- syncStatus="not-sync"
│   └── Japan 2026/                           <-- Subfolder (syncStatus="not-sync")
│       ├── Tokyo/                            <-- Nested Subfolder (syncStatus="not-sync")
│       │   ├── Day 1/                        <-- Deeper Nested Subfolder
│       │   │   ├── IMG_001.jpg               <-- syncStatus="not-sync"
│       │   │   └── IMG_002.jpg               <-- syncStatus="not-sync"
│       │   └── Day 2/
│       └── Kyoto/
└── Travel Archive/                            <-- Synced / finished parent
    └── Japan 2026/                           <-- Moved here upon "Mark as synced"
        └── Tokyo/                            <-- Hierarchy preserved
            └── Day 1/
```

### 2.2 Drive Properties & Tagging Rules
* **All Nested Folders**:
  * Created with public Drive property `properties = { syncStatus: "not-sync" }`.
  * Each folder references its direct parent via `parents: [parentFolderId]`.
* **Nested Media Files**:
  * Uploaded into their specific leaf folder (`parents: [leafFolderId]`) with `properties = { syncStatus: "not-sync" }`.
* **Recursive Syncing**:
  * Marking a folder as synced moves the top folder to `Travel Archive` and recursively clears the `syncStatus` tag across all nested subfolders and media files.

---

## 3. Backend API Contract (`functions/api/`)

### 3.1 `POST /api/folders` (Nested Path Resolution)
Creates or resolves nested folder paths in a single call or sequentially.
* **Request Body (JSON)**:
  ```json
  {
    "path": "Japan 2026/Tokyo/Day 1",
    "parentId": "<optional-folder-id>"
  }
  ```
  *(If `parentId` is omitted, resolution starts at `Travel Inbox`).*
* **Behavior**:
  * Splits `path` by `/` segments.
  * Sequentially checks/creates each subfolder level inside its parent.
  * Tags newly created subfolders with `syncStatus = "not-sync"`.
  * Returns the resolved leaf folder info and full path chain.
* **Response (JSON)**:
  ```json
  {
    "ok": true,
    "folder": {
      "id": "1leaf...",
      "name": "Day 1",
      "parentId": "1tokyo...",
      "path": "Japan 2026/Tokyo/Day 1"
    }
  }
  ```

### 3.2 `POST /api/upload` (Updated)
* **Request (Multipart Form Data)**:
  * `file`: Binary file.
  * `folderId` (optional): Direct target folder ID (leaf subfolder).
  * `folderPath` (optional): If provided (e.g. from `webkitRelativePath`), server resolves or creates the nested path under `Travel Inbox`.
* **Behavior**:
  * Places file in the resolved folder (`parents: [targetFolderId]`).
  * Sets `properties: { syncStatus: "not-sync" }`.
* **Response (JSON)**:
  ```json
  { "ok": true, "file": { "id": "...", "name": "...", "parentId": "..." } }
  ```

### 3.3 `GET /api/files` (Hierarchical & Breadcrumb Support)
* **Query Parameters**:
  * `filter`: `"all"` | `"not-sync"` | `"synced"` (default: `"not-sync"`)
  * `search`: string (optional)
  * `folderId`: string (optional, defaults to root of current filter)
* **Response (JSON)**:
  ```json
  {
    "currentFolderId": "1tokyo...",
    "currentFolderName": "Tokyo",
    "breadcrumbs": [
      { "id": "root", "name": "Travel Inbox" },
      { "id": "1japan...", "name": "Japan 2026" },
      { "id": "1tokyo...", "name": "Tokyo" }
    ],
    "subfolders": [
      { "id": "1day1...", "name": "Day 1", "itemCount": 24, "syncStatus": "not-sync" },
      { "id": "1day2...", "name": "Day 2", "itemCount": 15, "syncStatus": "not-sync" }
    ],
    "files": [ ... ],
    "filter": "not-sync",
    "folderReady": true
  }
  ```

### 3.4 `POST /api/folders/:id/mark-synced`
* **Behavior**:
  * Recursively clears `syncStatus` on the folder, all nested subfolders, and all child media.
  * If the folder is an immediate child of `Travel Inbox`, moves it to `Travel Archive`.
* **Response (JSON)**:
  ```json
  { "ok": true, "syncStatus": "synced", "movedCount": 42 }
  ```

---

## 4. Frontend UI & User Experience

### 4.1 Nested Folder Upload & Creation
* **Folder Drag-and-Drop / Folder Picker**:
  * When an entire folder is dropped or chosen via `<input type="file" webkitdirectory>`, files include their full relative path via `file.webkitRelativePath` (e.g., `Japan 2026/Tokyo/Day 1/IMG_001.jpg`).
  * The frontend client-side path cache groups files by relative path directory.
  * Creates or resolves the full nested path on Drive, then uploads files to their respective leaf folder.
* **Contextual "+ New Folder"**:
  * When browsing inside a folder (e.g. `Travel Inbox > Japan 2026`), clicking "+ New Folder" creates the new folder directly inside the current level (`Japan 2026`).

### 4.2 Dynamic Breadcrumbs
* **Deep Navigation**:
  * Displays a full interactive breadcrumb trail:
    `[Travel Inbox] > [Japan 2026] > [Tokyo] > [Day 1]`
  * Clicking any breadcrumb segment jumps directly to that level.
* **Folder Cards**:
  * Renders subfolders as clean cards with folder icon, title, item count badge, and sync chip.

### 4.3 Batch Upload Engine
* Sequential queue handling unlimited nested files.
* Displays current file path being uploaded: **"Uploading (18/120): Tokyo/Day 1/IMG_018.jpg"**.
* Batch aggregate progress bar and per-file retry handling.

### 4.4 Batch Download Engine
* **In-Browser Batch Download**:
  * One-click **"Batch download this folder (and subfolders)"**.
  * Paced client-side stream downloads with progress indicator.
* **Home Bulk-Download**:
  * JSON manifest includes `folderPath` for each file, allowing home download tools to reconstruct the exact nested directory structure on your local hard drive.

