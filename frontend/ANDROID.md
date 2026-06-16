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

## Push notifications (FCM — free)

Mobile alerts use **Firebase Cloud Messaging** (not browser web push).

### 1. Firebase project

1. [Firebase Console](https://console.firebase.google.com/) → create project
2. **Add Android app** → package name `com.vishal.pandamind`
3. Download `google-services.json` → place at `frontend/android/app/google-services.json`
4. **Project settings → Service accounts** → **Generate new private key** (JSON)

### 2. Backend env (AWS)

Either paste the full JSON:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Or set:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Run migration on AWS:

```bash
npx prisma migrate deploy
```

Rebuild APK after adding `google-services.json`:

```bash
npm run android:apk
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

## Debug on a real phone (see logs on your Mac)

### 1. Enable USB debugging on the phone

1. **Settings → About phone** → tap **Build number** 7 times (enables Developer options)
2. **Settings → Developer options** → turn on **USB debugging**
3. Connect phone to Mac with a **data** USB cable
4. On the phone, tap **Allow** when asked to trust this computer

### 2. Check the phone is connected

```bash
cd frontend
npm run android:devices
```

You should see your device listed as `device` (not `unauthorized`).

If `adb` is not found, add Android SDK to your shell profile:

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
```

### 3. Stream logs in this terminal (best for native / WebView errors)

```bash
cd frontend
npm run android:logs
```

Keep this running, reproduce the bug on the phone, and watch errors appear here.

### 4. Chrome DevTools (best for login, fetch, JS, network)

The app loads your website in a WebView — you can debug it like Chrome:

1. On the phone, open **PandaMind** and go to the screen with the bug
2. On your Mac, open **Google Chrome**
3. Go to: **chrome://inspect/#devices**
4. Under **Remote Target**, find **PandaMind** / `chatapp.vishaltech.in`
5. Click **inspect**

You get Console, Network (failed API calls), and Sources — same as debugging the website.

### 5. Run app from Mac directly on the phone (optional)

```bash
cd frontend
npm run build:android
npx cap run android
```

Picks a connected device and installs the debug build with live logging.

### Quick reference

| What you need | Command / tool |
|---------------|----------------|
| Is phone connected? | `npm run android:devices` |
| Terminal logs | `npm run android:logs` |
| JS / network / login errors | Chrome → `chrome://inspect` |
| Reinstall debug build | `npx cap run android` |
