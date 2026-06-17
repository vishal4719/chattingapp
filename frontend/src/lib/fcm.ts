import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  ActionPerformed,
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import { api } from "./api";
import { shouldSuppressMessageAlert } from "./notification-focus";

/** Must match backend FCM android.notification.channelId and AndroidManifest default channel. */
export const FCM_CHANNEL_ID = "pandamind_messages";

const FCM_DEVICE_TOKEN_KEY = "fcm-device-token";

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

async function persistDeviceToken(token: string): Promise<boolean> {
  localStorage.setItem(FCM_DEVICE_TOKEN_KEY, token);
  try {
    await saveFcmToken(token);
    return true;
  } catch (err) {
    console.error("[fcm] failed to save token on server:", err);
    registrationWaiter?.(false);
    registrationWaiter = null;
    return false;
  }
}

async function syncCachedTokenWithBackend(): Promise<boolean> {
  const cached = localStorage.getItem(FCM_DEVICE_TOKEN_KEY);
  if (!cached) return false;

  const hasAuth =
    localStorage.getItem("userToken") || localStorage.getItem("adminToken");
  if (!hasAuth) return false;

  try {
    const { enabled } = await api.getPushConfig();
    if (!enabled) return false;
  } catch {
    return false;
  }

  return persistDeviceToken(cached);
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

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await PushNotifications.createChannel({
      id: FCM_CHANNEL_ID,
      name: "Messages & calls",
      description: "New messages and incoming calls",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      sound: "default",
    });
  } catch (err) {
    console.error("[fcm] createChannel failed:", err);
  }
}

async function ensureLocalNotificationPermission(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "prompt" || status.display === "prompt-with-rationale") {
      await LocalNotifications.requestPermissions();
    }
  } catch (err) {
    console.error("[fcm] local notification permission failed:", err);
  }
}

async function showForegroundNotification(
  notification: PushNotificationSchema
): Promise<void> {
  const data = notification.data as Record<string, string> | undefined;
  const conversationId = data?.conversationId;
  if (conversationId && shouldSuppressMessageAlert(conversationId)) return;

  const title = notification.title ?? "New message";
  const body = notification.body ?? "";

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: (Date.now() % 2_000_000_000) + 1,
          title,
          body,
          channelId: FCM_CHANNEL_ID,
          extra: data,
        },
      ],
    });
  } catch (err) {
    console.error("[fcm] foreground local notification failed:", err);
  }
}

function attachPushListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener("registration", async (token: Token) => {
    await persistDeviceToken(token.value);
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
        void showForegroundNotification(notification);
      }
    }
  );

  void LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    navigateFromNotification(action.notification.extra as Record<string, string>);
  });
}

async function hasPushPermission(): Promise<boolean> {
  const status = await PushNotifications.checkPermissions();
  return status.receive === "granted";
}

async function registerForPushIfReady(): Promise<void> {
  attachPushListeners();
  await ensureAndroidNotificationChannel();
  await ensureLocalNotificationPermission();

  const synced = await syncCachedTokenWithBackend();
  if (synced) return;

  try {
    const { enabled } = await api.getPushConfig();
    if (!enabled) return;
  } catch {
    return;
  }

  await PushNotifications.register();
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

  await registerForPushIfReady();
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

  await ensureAndroidNotificationChannel();
  await ensureLocalNotificationPermission();

  const alreadySynced = await syncCachedTokenWithBackend();
  if (alreadySynced) return true;

  try {
    const { enabled } = await api.getPushConfig();
    if (!enabled) {
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
