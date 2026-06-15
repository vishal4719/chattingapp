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
    "serviceWorker" in navigator
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
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
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return;
  }

  const tag = conversationId ?? url ?? title;
  const notification = new Notification(title, {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
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

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

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

  if (Notification.permission !== "granted") return;

  try {
    await registerPushSubscription();
  } catch {
    // Push may fail if VAPID is not configured on the server
  }
}

export async function enableNotifications(): Promise<boolean> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return false;

  try {
    return await registerPushSubscription();
  } catch {
    return Notification.permission === "granted";
  }
}
