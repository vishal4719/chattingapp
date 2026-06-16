/// <reference types="node" />

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Default: load the live site (same CORS origin as the browser).
 * Set CAPACITOR_USE_BUNDLE=true to ship web assets inside the APK.
 */
const PRODUCTION_APP_URL = "https://chatapp.vishaltech.in";
const useBundledAssets = process.env.CAPACITOR_USE_BUNDLE === "true";

const config: CapacitorConfig = {
  appId: "com.vishal.pandamind",
  appName: "PandaMind",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SystemBars: {
      insetsHandling: "disable",
    },
  },
  ...(useBundledAssets
    ? {}
    : {
        server: {
          url: PRODUCTION_APP_URL,
          androidScheme: "https",
          iosScheme: "https",
          cleartext: false,
        },
      }),
};

export default config;
