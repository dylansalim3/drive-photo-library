# Approach A: External Google Drive & Shared Folder Setup Guide 📁

This guide outlines how to use **Approach A** in **Drive Photo Library (DPL)** to collaborate with family, friends, or travel companions using external Google Drive accounts.

---

## 1. Architectural Overview

```
 ┌──────────────────────┐      Shares Folder/Drive       ┌────────────────────────────────┐
 │ Friend / Family      │ ─────────────────────────────> │ Central DPL Server Account     │
 │ Personal Google Drive│     (with Editor role)         │ (Single OAuth refresh token)   │
 └──────────────────────┘                                └────────────────────────────────┘
                                                                        ▲
                                                                        │ D1 Session Auth
                                                                        │ (No client Google OAuth)
                                                         ┌──────────────┴─────────────────┐
                                                         │ Web & Android Client App       │
                                                         │ - Multi-user logins            │
                                                         │ - @alice, @bob attribution     │
                                                         │ - Staging (not-sync) workflow  │
                                                         └────────────────────────────────┘
```

### Why Approach A?
1. **Zero Client-Side Google OAuth**: End-users do not connect their Google accounts inside the mobile app or browser. Instead, they authenticate with lightweight, salted PBKDF2 credentials managed in Cloudflare D1.
2. **External Storage Offload**: Media files can live inside a friend or family member's Google Drive or Google Workspace Shared Drive, preserving personal quotas and enabling shared travel albums.
3. **Uploader Attribution**: Every file uploaded through the app is stamped with `uploadedBy = <username>` in Google Drive public properties, enabling filtering by `@alice`, `@bob`, etc.

---

## 2. Step-by-Step Instructions for Friends / Family (Folder Owners)

When you want a friend or family member to contribute their Google Drive space for a trip or album:

### Step 1: Create or Locate the Trip Folder
- Open Google Drive on the web ([drive.google.com](https://drive.google.com)) or the Google Drive mobile app.
- Create a new folder (e.g., `Japan 2026`, `Hawaii Vacation`, or `Family Archive`).

### Step 2: Share with the Central Server Email
1. Right-click the folder and select **Share** -> **Share** (or tap `...` -> **Share** in the mobile app).
2. Enter the **Central Server Account Email** (shown in DPL under **Settings** -> **Shared Folder Configuration** or Android top bar menu).
3. Set the permission role to **Editor** (required so the server can create subfolders and upload staged media).
4. Uncheck *Notify people* (optional) and click **Send** / **Done**.

### (Optional) Sharing a Google Workspace Shared Drive
If using Google Workspace:
1. Open the Shared Drive.
2. Click **Manage members**.
3. Add the server email with **Content manager** or **Manager** permissions.

---

## 3. Selecting & Switching the Active Shared Folder in DPL

### On the Web Application:
1. Open the DPL web app and sign in.
2. Click the **Gear icon (Settings)** in the top right.
3. Scroll down to **Google Drive & Shared Folders (Approach A)**.
4. You will see:
   - The central server Google account email with a 1-click **Copy** button.
   - The **Current Active Root Folder** name and ID.
   - A list of **Discovered Drives & Folders** shared with the server account.
5. Click **Connect** next to any discovered folder, or paste a folder ID into the input field and click **Connect Folder**.
6. The gallery will immediately reload rooted at that shared folder!

### On the Native Android Application:
1. Open the DPL Android app and sign in.
2. Tap the user avatar in the search bar to open the menu.
3. Tap **Shared Drive / Folder**.
4. The bottom sheet displays:
   - The connected server account email with copy icon.
   - The active root folder name and ID.
   - Discovered shared drives and shared folders.
5. Tap **Select** on any discovered item, or paste a folder ID into the input field and tap **Connect**.

---

## 4. Multi-User Upload Attribution & Vacation Staging

### Automatic Tagging
When any user uploads a file through Web or Android:
- **`uploadedBy`**: Stamped with the user's username (e.g. `uploadedBy = "alice"`).
- **`syncStatus`**: Stamped with `"not-sync"` to place it into vacation staging.

### Gallery Features:
- **Uploader Avatar Pills**: Displayed on thumbnail cards, list rows, and fullscreen media lightboxes.
- **Uploader Filter**: Tap any `@username` filter chip in the gallery toolbar to view only items uploaded by that companion.
- **Vacation Sync Center**: Download all pending trip photos as a structured ZIP archive or mark them as synced to move them into `Travel Archive`.
