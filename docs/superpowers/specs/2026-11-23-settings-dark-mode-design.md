# Specification: Settings Panel & Tri-State Theme Engine (Light / Dark / Follow System)

**Date**: 2026-11-23  
**Status**: Approved by User  
**Repository**: `drive-photo-library`  

---

## 1. Overview & Goals

This specification details the design for adding a dedicated **Settings modal** to the Drive Photo Library application. The settings panel allows users to:
1. Verify their logged-in app username and active session status.
2. Check Google Drive connection health, including the configured parent folder ID.
3. Choose their theme mode: **Light**, **Dark**, or **Follow System**, with zero flicker on page load.

---

## 2. Settings Modal Structure & Access

### 2.1 Trigger
* A header icon button (`RiSettings3Line`) is located in the top navigation bar next to the user avatar and sign-out button.
* Tapping the gear icon opens the Settings modal.

### 2.2 Modal Surface
* Built with BoardUI semantic tokens (`bg-background-primary-default`, `border-border-button-default`, `text-text-primary`).
* Includes a title ("Settings"), close button (`RiCloseLine`), and backdrop overlay.

---

## 3. Account & Connection Status

The settings view displays two primary status sections:

### 3.1 App Session Status
* **Username**: Displays the active session's username (fetched via `/api/auth/status`).
* **Session Health**: Shows an active status chip (`Active`).
* **Sign Out**: A BoardUI button to end the session immediately.

### 3.2 Google Drive Connection Status
* **Status**: Displays `Connected` (green lime chip) or `Not Connected` / `Error` (yellow/rose chip).
* **Target Root Folder**: Displays the configured parent root folder ID (`1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb`).
* **Reconnect**: If Drive is disconnected or token expired, displays a direct button to re-authorize via `/api/auth/drive/connect`.

---

## 4. Theme Engine (Light / Dark / Follow System)

### 4.1 Theme Modes
* **Light (`light`)**: Forces `.dark` removed from `<html>`.
* **Dark (`dark`)**: Forces `.dark` added to `<html>`.
* **Follow System (`system`)**: Dynamically sets `.dark` on `<html>` based on `window.matchMedia('(prefers-color-scheme: dark)').matches`. Automatically updates when the OS switches themes via a `change` event listener.

### 4.2 Storage & FOUT Prevention
* Preference is stored in `localStorage` under key `dpl_theme` (`"light"` | `"dark"` | `"system"`). Default is `"system"`.
* An inline `<script>` in `index.html` executes immediately in `<head>` before HTML rendering to apply `.dark` if appropriate, eliminating any white flash during initial page load.

---

## 5. Backend Status API Enhancement

To display the current logged-in username in settings:
* Update `GET /api/auth/status` to return `{ configured, authenticated, driveConnected, username?: string, rootFolderId?: string }`.
* Update `AuthStatus` type in `functions/_lib/types.ts` and `src/api.ts`.

---

## 6. Verification Plan

1. Verify TypeScript compilation: `npm run build`.
2. Verify switching between Light, Dark, and Follow System updates the `.dark` class on `<html>` in real-time and persists across page reloads.
3. Verify the Settings modal shows the correct username and Drive connection status.
4. Verify deployment to Cloudflare Pages.
