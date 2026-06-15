import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android/iOS app loads the live website in a native shell.
 * Same origin as the browser → same API calls, same CORS, no localhost mess.
 */
const PRODUCTION_APP_URL = "https://chatapp.vishaltech.in";

const config: CapacitorConfig = {
  appId: "com.pandamind.app",
  appName: "PandaMind",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: PRODUCTION_APP_URL,
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
};

export default config;
