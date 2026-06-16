import { Capacitor } from "@capacitor/core";
import { api } from "./api";
import { getServiceWorkerRegistration } from "./pwa";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function notificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function safeNotificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  return safeNotificationPermission();
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showLocalNotification(
  title: string,
  body: string,
  url?: string,
  conversationId?: string
): void {
  if (!notificationsSupported() || safeNotificationPermission() !== "granted") {
    return;
  }

  const tag = conversationId ?? url ?? title;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
          data: { url: url ? new URL(url, window.location.origin).href : window.location.href },
        })
      )
      .catch(() => undefined);
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
  });

  notification.onclick = () => {
    window.focus();
    if (url) {
      window.location.href = url;
    }
    notification.close();
  };
}

export async function registerPushSubscription(): Promise<boolean> {
  if (!notificationsSupported()) return false;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return false;

  const { enabled, publicKey } = await api.getPushConfig();
  if (!enabled || !publicKey) return false;

  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  await api.registerPushSubscription({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });

  return true;
}

export async function initNotifications(): Promise<void> {
  const hasAuth =
    localStorage.getItem("userToken") || localStorage.getItem("adminToken");
  if (!hasAuth || !notificationsSupported()) return;

  if (safeNotificationPermission() !== "granted") return;

  try {
    await registerPushSubscription();
  } catch {
    // Push may fail if server/database is not ready
  }
}

export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return false;

  try {
    return await registerPushSubscription();
  } catch {
    return false;
  }
}

export function getNotificationUnsupportedReason(): string | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return "This browser does not support notifications.";
  if (!("serviceWorker" in navigator)) return "Notifications require a supported browser (Chrome recommended).";
  if (!("PushManager" in window)) return "Push notifications are not available in this browser or app.";
  if (safeNotificationPermission() === "denied") {
    return "Notifications are blocked. Enable them in your browser or phone settings.";
  }
  return null;
}
