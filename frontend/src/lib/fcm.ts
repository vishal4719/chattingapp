import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import { api } from "./api";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

let listenersAttached = false;
let registrationWaiter: ((ok: boolean) => void) | null = null;

async function saveFcmToken(token: string): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform !== "android" && platform !== "ios") return;
  await api.registerFcmToken({ token, platform });
  localStorage.setItem("fcm-enabled", "1");
  registrationWaiter?.(true);
  registrationWaiter = null;
}

function navigateFromNotification(data?: Record<string, string>) {
  const rawUrl = data?.url;
  if (!rawUrl) return;
  try {
    const path = rawUrl.startsWith("http")
      ? new URL(rawUrl).pathname + new URL(rawUrl).search
      : rawUrl;
    if (window.location.pathname + window.location.search !== path) {
      window.location.href = path;
    }
  } catch {
    // ignore malformed URLs
  }
}

function attachPushListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener("registration", async (token: Token) => {
    try {
      await saveFcmToken(token.value);
    } catch {
      registrationWaiter?.(false);
      registrationWaiter = null;
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[fcm] registration failed:", err);
    registrationWaiter?.(false);
    registrationWaiter = null;
  });

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      navigateFromNotification(action.notification.data as Record<string, string>);
    }
  );

  PushNotifications.addListener(
    "pushNotificationReceived",
    (notification: PushNotificationSchema) => {
      if (document.visibilityState === "visible") {
        navigateFromNotification(notification.data as Record<string, string>);
      }
    }
  );
}

async function hasPushPermission(): Promise<boolean> {
  const status = await PushNotifications.checkPermissions();
  return status.receive === "granted";
}

export async function initFcm(): Promise<void> {
  if (!isNativeApp()) return;

  const hasAuth =
    localStorage.getItem("userToken") || localStorage.getItem("adminToken");
  if (!hasAuth) return;

  attachPushListeners();

  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
    if (localStorage.getItem("fcm-permission-asked") === "1") return;
    localStorage.setItem("fcm-permission-asked", "1");
    status = await PushNotifications.requestPermissions();
  }

  if (status.receive !== "granted") return;

  try {
    const { enabled } = await api.getPushConfig();
    if (!enabled) return;
  } catch {
    return;
  }

  await PushNotifications.register();
}

export async function enableFcm(): Promise<boolean> {
  if (!isNativeApp()) return false;

  attachPushListeners();

  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
    localStorage.setItem("fcm-permission-asked", "1");
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== "granted") return false;

  try {
    const { enabled } = await api.getPushConfig();
    if (!enabled) {
      // Permission granted; token will register once backend FCM env is set.
      await PushNotifications.register();
      return false;
    }
  } catch {
    await PushNotifications.register();
    return false;
  }

  return new Promise<boolean>((resolve) => {
    registrationWaiter = resolve;
    void PushNotifications.register();
    setTimeout(() => {
      if (registrationWaiter) {
        registrationWaiter(localStorage.getItem("fcm-enabled") === "1");
        registrationWaiter = null;
      }
    }, 12000);
  });
}

export async function isFcmEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  return (await hasPushPermission()) && localStorage.getItem("fcm-enabled") === "1";
}

export function getFcmUnsupportedReason(): string | null {
  if (!isNativeApp()) return "Install the PandaMind app to receive push notifications.";
  return null;
}
