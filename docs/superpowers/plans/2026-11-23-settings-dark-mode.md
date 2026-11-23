# Settings Panel & Tri-State Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a Settings modal showing logged-in user status and Drive connection health, with a tri-state theme selector (Light / Dark / Follow System) and zero-flicker loading.

**Architecture:** The backend returns session `username` and `rootFolderId` from `GET /api/auth/status`. The frontend maintains theme state (`light` | `dark` | `system`) persisted in `localStorage`, responds to OS theme changes when on `system`, and provides a Settings dialog to inspect account and Drive connection status.

**Tech Stack:** React 19, TypeScript, BoardUI semantic tokens & components, Tailwind CSS v4, Cloudflare Pages Functions.

---

### Task 1: Backend: Return `username` and `rootFolderId` in `GET /api/auth/status`

**Files:**
- Modify: `functions/_lib/types.ts`
- Modify: `functions/api/auth/status.ts`

- [ ] **Step 1: Update `AuthStatus` type in `functions/_lib/types.ts`**
Add `username?: string` and `rootFolderId?: string`.

- [ ] **Step 2: Update `GET /api/auth/status` in `functions/api/auth/status.ts`**
Return `username` (from `session`) and `rootFolderId` (from `getRootFolderId(context.env)`).

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npm run build`

- [ ] **Step 4: Commit**
```bash
git add functions/_lib/types.ts functions/api/auth/status.ts
git commit -m "feat(backend): return username and rootFolderId in auth status"
```

---

### Task 2: Theme Utility & Zero-Flicker Script

**Files:**
- Create: `src/utils/theme.ts`
- Modify: `index.html`

- [ ] **Step 1: Create `src/utils/theme.ts`**
Implement `getTheme()`, `setTheme(mode)`, and `applyTheme(mode)` with `localStorage` and `matchMedia` listener.

- [ ] **Step 2: Add inline FOUT prevention script in `index.html`**
Inline script in `<head>` applies `.dark` before first paint.

- [ ] **Step 3: Commit**
```bash
git add src/utils/theme.ts index.html
git commit -m "feat(theme): add theme utility and early head script"
```

---

### Task 3: Frontend API & Types

**Files:**
- Modify: `src/api.ts`

- [ ] **Step 1: Update `AuthStatus` in `src/api.ts`**
Add `username?: string` and `rootFolderId?: string`.

- [ ] **Step 2: Commit**
```bash
git add src/api.ts
git commit -m "feat(api): update AuthStatus type with username and rootFolderId"
```

---

### Task 4: Settings Modal in `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Settings button to header**
Add gear icon button (`RiSettings3Line`) to the main header.

- [ ] **Step 2: Implement Settings modal component**
Render modal displaying:
1. Theme selector (Light / Dark / Follow System).
2. Logged-in session status (username, active chip, sign out).
3. Google Drive status (Connected chip, root folder ID, reconnect button).

- [ ] **Step 3: Connect theme changes to `setTheme`**

- [ ] **Step 4: Verify build**
Run: `npm run build`

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx
git commit -m "feat(ui): add settings modal with theme switcher and account status"
```

---

### Task 5: Build & Production Deployment

- [ ] **Step 1: Run full build**
Run: `npm run build`

- [ ] **Step 2: Deploy to Cloudflare Pages**
Run: `npx wrangler pages deploy dist --project-name drive-photo-library`

- [ ] **Step 3: Verify live endpoint**
Check `https://drive-photo-library.pages.dev/api/auth/status`.
