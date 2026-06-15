# Android APK Build

This wraps the React app in a native Android shell using [Capacitor](https://capacitorjs.com/).

## Prerequisites

1. **Node.js** — already used for the frontend
2. **Java JDK 21** — required by Capacitor Android (JDK 17 is too old; JDK 25 may fail)
3. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
   - Install Android SDK (API 34+ recommended)
   - Accept SDK licenses in Android Studio → SDK Manager

## One-time setup

### 1. Configure production backend URLs

The APK bundles the frontend and talks to your **production** backend (not localhost).

```bash
cd frontend
cp .env.android.example .env.android
```

Edit `.env.android` with your live backend URLs:

```env
VITE_API_URL=https://api.vishaltech.in
VITE_WS_URL=https://api.vishaltech.in
```

### 2. Deploy backend CORS update

The backend must allow Capacitor's origin (`https://localhost`). The repo already includes this in `getAllowedOrigins()`. **Redeploy your backend** after pulling these changes.

Optionally add extra origins in backend `.env`:

```env
EXTRA_CORS_ORIGINS=https://localhost,capacitor://localhost
```

### 3. Add the Android platform (first time only)

```bash
cd frontend
npm install
npm run build -- --mode android   # needs .env.android first
npx cap add android
npx cap sync android
```

## Build a debug APK (for testing / sideloading)

```bash
cd frontend
npm run build:android    # builds web app + syncs to android/
npm run android:apk      # produces debug APK
```

APK output:

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Copy `app-debug.apk` to your phone and install it (enable "Install unknown apps" for your file manager).

The hosted download page is at `/download` — it serves `public/downloads/pandamind.apk`. After rebuilding the APK, run `npm run android:apk` to refresh the file in `public/`.

## Build via Android Studio (optional)

```bash
cd frontend
npm run build:android
npm run android:open
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

## Release APK (Play Store or signed sideload)

1. Android Studio → **Build → Generate Signed Bundle / APK**
2. Create or use a keystore
3. Choose **release** build variant

Or from CLI after configuring signing in `android/app/build.gradle`:

```bash
cd frontend/android
./gradlew assembleRelease
```

## Rebuild after code changes

Whenever you change frontend code:

```bash
cd frontend
npm run build:android
npm run android:apk
```

## Permissions

The Android project includes:

- Internet (API + WebSocket + LiveKit)
- Camera and microphone (video/voice calls)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API calls fail / CORS errors | Redeploy backend with Capacitor CORS support; verify `.env.android` URLs |
| Blank white screen | Run `npm run build:android` again; check `adb logcat` |
| `./gradlew` not found | Open Android Studio once to finish SDK setup |
| JDK errors | Use JDK 21: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` then rebuild |

## What you get

- **Debug APK** — install directly on Android phones (no Play Store)
- **Not** a Play Store listing — that requires a signed release build + Google Play Console account ($25 one-time)
