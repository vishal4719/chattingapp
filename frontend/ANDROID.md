# Android APK Build

The PandaMind Android app is a **native shell** that loads your live website:

| | URL |
|---|-----|
| **App loads** | [https://chatapp.vishaltech.in](https://chatapp.vishaltech.in) |
| **API / WebSocket** | [https://api.vishaltech.in](https://api.vishaltech.in) |

Same setup as opening the site in Chrome — **no bundled localhost, no extra CORS config**.

## Prerequisites

1. **Node.js**
2. **Java JDK 21**
3. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)

## Build a debug APK

```bash
cd frontend
npm install
npm run build:android    # sync Capacitor + copy config
npm run android:apk      # produces APK + copies to public/downloads/
```

APK output: `frontend/public/downloads/pandamind.apk`

Users need **internet** to open the app (it loads the live site).

## When you change the website

Deploy frontend to Vercel as usual — **the app updates automatically**, no APK rebuild needed.

Rebuild the APK only when changing **native** things (app icon, permissions, app name).

## Backend env (AWS)

Standard production config — nothing special for the app:

```env
FRONTEND_URL=https://chatapp.vishaltech.in
API_PUBLIC_URL=https://api.vishaltech.in
```

Vercel frontend env:

```env
VITE_API_URL=https://api.vishaltech.in
VITE_WS_URL=https://api.vishaltech.in
```

## Install on phone

1. Download from [https://chatapp.vishaltech.in/download](https://chatapp.vishaltech.in/download)
2. Install `PandaMind.apk`
3. Open and sign in — same login as the website

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login / fetch fails | Confirm website works in Chrome first; check internet on phone |
| Blank screen | Phone needs internet; verify chatapp.vishaltech.in loads in browser |
| `./gradlew` errors | Use JDK 21: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` |

## Optional: `.env.android`

Not needed for the APK anymore. The app loads the live site where Vercel already has `VITE_API_URL` and `VITE_WS_URL` set.
