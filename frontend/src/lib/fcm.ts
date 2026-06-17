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

export interface PushRegistrationStatus {
  configured: boolean;
  registered: boolean;
  tokenCount: number;
  firebaseProjectId: string | null;
  expectedAndroidProjectId: string;
  projectMatches: boolean;
  platforms: string[];
  lastUpdatedAt: string | null;
}

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
    localStorage.removeItem("fcm-enabled");
    registrationWaiter?.(false);
    registrationWaiter = null;
    return false;
  }
}

export async function getPushRegistrationStatus(): Promise<PushRegistrationStatus | null> {
  try {
    const status = await api.getPushStatus();
    return {
      ...status,
      projectMatches:
        !!status.firebaseProjectId &&
        status.firebaseProjectId === status.expectedAndroidProjectId,
    };
  } catch {
    return null;
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

  const title = notification.title ?? data?.title ?? "New message";
  const body = notification.body ?? data?.body ?? "";

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
    localStorage.removeItem("fcm-enabled");
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
      void showForegroundNotification(notification);
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

  await syncCachedTokenWithBackend();

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

  const status = await PushNotifications.checkPermissions();
  if (status.receive !== "granted") {
    if (
      status.receive === "prompt" ||
      status.receive === "prompt-with-rationale"
    ) {
      if (localStorage.getItem("fcm-permission-asked") === "1") return;
      localStorage.setItem("fcm-permission-asked", "1");
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== "granted") return;
    } else {
      return;
    }
  }

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

  const synced = await syncCachedTokenWithBackend();
  if (synced) {
    const statusOnServer = await getPushRegistrationStatus();
    if (statusOnServer?.registered) {
      try {
        await api.sendTestPush();
      } catch {
        // Token exists on server; test push is optional.
      }
      return true;
    }
  }

  return new Promise<boolean>((resolve) => {
    registrationWaiter = resolve;
    void PushNotifications.register();
    setTimeout(async () => {
      if (!registrationWaiter) return;
      const ok = localStorage.getItem("fcm-enabled") === "1";
      if (ok) {
        try {
          await api.sendTestPush();
        } catch {
          // ignore optional test push failure
        }
      }
      registrationWaiter(ok);
      registrationWaiter = null;
    }, 12000);
  });
}

export async function isFcmEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (!(await hasPushPermission())) return false;
  if (localStorage.getItem("fcm-enabled") === "1") return true;

  const status = await getPushRegistrationStatus();
  if (status?.registered) {
    localStorage.setItem("fcm-enabled", "1");
    return true;
  }
  return false;
}

export function getFcmUnsupportedReason(): string | null {
  if (!isNativeApp()) return "Install the PandaMind app to receive push notifications.";
  return null;
}

export async function getFcmSetupError(): Promise<string | null> {
  const status = await getPushRegistrationStatus();
  if (!status) return "Could not reach the notification server.";
  if (!status.configured) {
    return "Server push is not configured yet.";
  }
  if (!status.projectMatches) {
    return `Firebase project mismatch. App uses ${status.expectedAndroidProjectId}, server uses ${status.firebaseProjectId ?? "unknown"}.`;
  }
  if (!status.registered) {
    return "Phone permission granted, but this device is not registered on the server yet.";
  }
  return null;
}
