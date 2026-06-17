/// <reference types="node" />

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Default: bundle web assets inside the APK so push/FCM code ships with the app.
 * Set CAPACITOR_USE_REMOTE=true to load the live site instead.
 */
const PRODUCTION_APP_URL = "https://chatapp.vishaltech.in";
const useRemoteServer = process.env.CAPACITOR_USE_REMOTE === "true";

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
      insetsHandling: "css",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      iconColor: "#25D366",
      sound: "default",
    },
  },
  ...(useRemoteServer
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
