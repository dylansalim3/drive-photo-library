# Android Kotlin Google Drive Material 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Android application in Kotlin using Jetpack Compose and Material 3 that connects to the deployed Cloudflare backend (`https://drive-photo-library.pages.dev`), mirroring the Google Drive mobile user interface with folder navigation, view switcher (Grid/List), mobile FAB bottom sheet, and fluid swipeable media viewer.

**Architecture:** Create an Android project in `/android` with Gradle, Jetpack Compose, Material 3, OkHttp3 with persistent session cookies, Retrofit2 with `kotlinx.serialization`, Coil 3 for stream-only thumbnail loading, Media3 ExoPlayer for video streaming, and MVI/MVVM architecture.

**Tech Stack:** Kotlin 2.x, Android Gradle Plugin, Jetpack Compose Material 3, OkHttp3, Retrofit2, Coil 3, AndroidX Media3, Coroutines & StateFlow.

---

### File Structure Map
- `android/settings.gradle.kts`: Project name and module inclusion.
- `android/build.gradle.kts`: Root Gradle build script with Kotlin & AGP plugins.
- `android/gradle/wrapper/gradle-wrapper.properties`: Gradle 8.x wrapper definition.
- `android/app/build.gradle.kts`: App module build script with Compose M3, Retrofit, Coil, Media3 dependencies.
- `android/app/src/main/AndroidManifest.xml`: Permissions (`INTERNET`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`) and `MainActivity`.
- `android/app/src/main/java/com/dylan/drivephotolibrary/DriveApplication.kt`: Application class configuring Coil OkHttp ImageLoader.
- `android/app/src/main/java/com/dylan/drivephotolibrary/MainActivity.kt`: Single-activity entry point hosting Compose UI.
- `android/app/src/main/java/com/dylan/drivephotolibrary/data/model/Models.kt`: Data models for `DriveFile`, `DriveFolder`, `Breadcrumb`, `AuthStatus`, `FilesResponse`.
- `android/app/src/main/java/com/dylan/drivephotolibrary/data/network/PersistentCookieJar.kt`: SharedPreferences-backed CookieJar for session cookies.
- `android/app/src/main/java/com/dylan/drivephotolibrary/data/network/NetworkModule.kt`: OkHttpClient and Retrofit singleton builder.
- `android/app/src/main/java/com/dylan/drivephotolibrary/data/api/DriveApiService.kt`: Retrofit API endpoints.
- `android/app/src/main/java/com/dylan/drivephotolibrary/data/repository/DriveRepository.kt`: Repository wrapping API calls.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/theme/Theme.kt`: Material 3 theme, colors, typography.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`: UI state, folder backstack, search, filter, upload queue.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/DriveTopBar.kt`: M3 SearchBar with view switcher and profile avatar.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/BreadcrumbsBar.kt`: Horizontal folder navigation chips with parent back button.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/FolderCards.kt`: Material 3 elevated folder cards and list items.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/MediaGrid.kt`: 2-column M3 photo cards with sync pills and video icons.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/MediaList.kt`: Compact list rows with 48dp thumbnails.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/UploadFabSheet.kt`: M3 Extended FAB + ModalBottomSheet for upload/new folder actions.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/LoginScreen.kt`: Material 3 sign-in screen.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/DriveScreen.kt`: Main Google Drive library screen.
- `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/MediaViewerScreen.kt`: Fullscreen `HorizontalPager` with pinch-to-zoom and ExoPlayer.

---

### Task 1: Initialize Android Project Skeleton & Gradle Configuration

**Files:**
- Create: `android/settings.gradle.kts`
- Create: `android/build.gradle.kts`
- Create: `android/app/build.gradle.kts`
- Create: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Scaffold Android project structure**
Use `android create` or direct Gradle DSL to create `android/` directory with `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`, and `AndroidManifest.xml` with Internet permission and Compose Material 3 dependencies.

- [ ] **Step 2: Verify Gradle build setup**
Run: `cd android && ./gradlew tasks` or `gradle tasks`
Expected: Gradle resolves dependencies without errors.

- [ ] **Step 3: Commit**
```bash
git add android/
git commit -m "chore(android): initialize Android project with Gradle and Compose M3"
```

---

### Task 2: Data Models, Persistent CookieJar & Retrofit API Service

**Files:**
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/data/model/Models.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/data/network/PersistentCookieJar.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/data/network/NetworkModule.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/data/api/DriveApiService.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/data/repository/DriveRepository.kt`

- [ ] **Step 1: Implement data models and network layer**
Implement Kotlin `@Serializable` data classes matching backend JSON, `PersistentCookieJar` storing cookies in `SharedPreferences`, Retrofit client pointing to `https://drive-photo-library.pages.dev`, and `DriveApiService`.

- [ ] **Step 2: Verify compile**
Run: `cd android && ./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**
```bash
git add android/app/src/main/java/com/dylan/drivephotolibrary/data/
git commit -m "feat(android): add data models, persistent cookie jar, and Retrofit API service"
```

---

### Task 3: Material 3 Theme & UI State ViewModel

**Files:**
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/theme/Color.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/theme/Theme.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/theme/Type.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`

- [ ] **Step 1: Implement M3 Theme & DriveViewModel**
Configure Material 3 color schemes, typography, and `DriveViewModel` with StateFlow managing `DriveUiState` (files, subfolders, breadcrumbs, search, filter, viewMode, active file).

- [ ] **Step 2: Verify compile**
Run: `cd android && ./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**
```bash
git add android/app/src/main/java/com/dylan/drivephotolibrary/ui/theme/ android/app/src/main/java/com/dylan/drivephotolibrary/ui/viewmodel/
git commit -m "feat(android): add Material 3 theme and DriveViewModel"
```

---

### Task 4: Google Drive Material 3 UI Components

**Files:**
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/DriveTopBar.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/BreadcrumbsBar.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/FolderCards.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/MediaGrid.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/MediaList.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/UploadFabSheet.kt`

- [ ] **Step 1: Implement Drive UI components**
Build M3 SearchBar with view switcher, folder breadcrumb chips, 2-column M3 elevated folder cards, 2-column rounded media grid with sync pills, compact media list rows, and M3 FAB + bottom action sheet.

- [ ] **Step 2: Verify compile**
Run: `cd android && ./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**
```bash
git add android/app/src/main/java/com/dylan/drivephotolibrary/ui/components/
git commit -m "feat(android): add Google Drive Material 3 UI components"
```

---

### Task 5: Fullscreen Swipeable Media Viewer & Main Activity Screens

**Files:**
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/LoginScreen.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/DriveScreen.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/MediaViewerScreen.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/DriveApplication.kt`
- Create: `android/app/src/main/java/com/dylan/drivephotolibrary/MainActivity.kt`

- [ ] **Step 1: Implement screens and MainActivity**
Wire `HorizontalPager` with pinch-to-zoom and ExoPlayer video streaming in `MediaViewerScreen.kt`, compose the main `DriveScreen.kt` with FAB and bottom sheet, add `LoginScreen.kt`, and configure `DriveApplication.kt` with Coil OkHttp ImageLoader.

- [ ] **Step 2: Verify assembleDebug APK build**
Run: `cd android && ./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL with `app-debug.apk` produced.

- [ ] **Step 3: Commit**
```bash
git add android/app/src/main/java/com/dylan/drivephotolibrary/ui/screens/ android/app/src/main/java/com/dylan/drivephotolibrary/MainActivity.kt android/app/src/main/java/com/dylan/drivephotolibrary/DriveApplication.kt
git commit -m "feat(android): add MediaViewerScreen with HorizontalPager and MainActivity"
```

---

### Task 6: Final Verification, Git Push & Summary

**Files:**
- Target: Full repo build and git sync

- [ ] **Step 1: Verify web and android builds**
Run: `npm run build && cd android && ./gradlew assembleDebug`
Expected: Both builds pass cleanly.

- [ ] **Step 2: Push to main**
Run: `git push origin main`
Expected: Successfully pushed to remote repository.
