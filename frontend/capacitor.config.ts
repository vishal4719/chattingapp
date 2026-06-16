/// <reference types="node" />

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APK ships bundled web assets (dist/) with production API URLs from .env.android.
 * Set CAPACITOR_USE_REMOTE=true to load the live site instead (needs deploy for updates).
 */
const PRODUCTION_APP_URL = "https://chatapp.vishaltech.in";
const useRemoteUrl = process.env.CAPACITOR_USE_REMOTE === "true";

const config: CapacitorConfig = {
  appId: "com.pandamind.app",
  appName: "PandaMind",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  ...(useRemoteUrl
    ? {
        server: {
          url: PRODUCTION_APP_URL,
          androidScheme: "https",
          iosScheme: "https",
          cleartext: false,
        },
      }
    : {}),
};

export default config;
