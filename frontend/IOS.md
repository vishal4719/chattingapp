# iOS App Build

Two ways to use PandaMind on iPhone — **PWA** (no Mac/Xcode needed) or **native Capacitor app** (requires Mac + Xcode).

## Option 1: PWA — easiest (already works)

No build step. Users install from Safari:

1. Open [https://chatapp.vishaltech.in/](https://chatapp.vishaltech.in/) in **Safari**
2. Tap **Share** → **Add to Home Screen**
3. Opens full-screen like an app

This is the iOS equivalent of Android’s “Install app” PWA flow. **No App Store, no `.ipa` file.**

---

## Option 2: Native iOS app (Capacitor)

Same React codebase as Android, wrapped in a native iOS shell.

### Prerequisites

- **Mac** with **Xcode** installed
- **Apple Developer account** ($99/year) — required to install on a **real iPhone** or distribute via TestFlight/App Store
- Backend URLs in `.env.android` (shared mobile env file):

```env
VITE_API_URL=https://api.vishaltech.in
VITE_WS_URL=https://api.vishaltech.in
```

Redeploy backend with Capacitor CORS support so origin `capacitor://localhost` is allowed.

### Build and run (Simulator — free, no Apple account)

```bash
cd frontend
npm run build:ios
npm run ios:open
```

In Xcode:

1. Select a simulator (e.g. iPhone 16)
2. Press **Run** (▶)

### Install on your iPhone

1. Open project in Xcode: `npm run ios:open`
2. Connect iPhone via USB
3. **Signing & Capabilities** → select your **Team** (Apple Developer account)
4. Select your device → **Run**

### TestFlight / App Store

1. Xcode → **Product → Archive**
2. **Distribute App** → TestFlight or App Store Connect

Requires Apple Developer Program membership.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run build:ios` | Build web app + sync to `ios/` |
| `npm run ios:open` | Open Xcode project |
| `npm run ios:run` | Build and run on simulator/device (CLI) |

---

## iOS vs Android distribution

| | Android | iOS |
|---|---------|-----|
| **Easy install (no store)** | Debug APK sideload | PWA only, or dev-signed via Xcode |
| **Shareable install file** | `app-debug.apk` | No public `.ipa` — Apple restricts sideloading |
| **Store listing** | Play Store ($25 one-time) | App Store ($99/year) |

**There is no iOS equivalent of emailing an APK.** Apple requires code signing for device installs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API / CORS errors | Redeploy backend; ensure `FRONTEND_URL=https://chatapp.vishaltech.in` |
| Signing errors in Xcode | Add Apple ID under Xcode → Settings → Accounts |
| Camera/mic denied | Check `Info.plist` usage descriptions (already configured) |
| Blank screen | Run `npm run build:ios` again |
