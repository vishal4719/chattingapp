import { shouldSuppressMessageAlert } from "./notification-focus";

const PERMISSION_ASKED_KEY = "browser-notifications-asked";
const ENABLED_KEY = "browser-notifications-enabled";

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isBrowserNotificationEnabled(): boolean {
  if (!isBrowserNotificationSupported()) return false;
  return (
    Notification.permission === "granted" &&
    localStorage.getItem(ENABLED_KEY) === "1"
  );
}

export async function enableBrowserNotifications(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;

  localStorage.setItem(PERMISSION_ASKED_KEY, "1");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  localStorage.setItem(ENABLED_KEY, "1");
  return true;
}

export function shouldShowBrowserNotificationBanner(): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (isBrowserNotificationEnabled()) return false;
  if (localStorage.getItem("browser-notifications-dismissed") === "1") return false;
  if (Notification.permission === "denied") return false;
  return true;
}

export function showBrowserMessageNotification(params: {
  conversationId: string;
  title: string;
  body: string;
  url: string;
}): void {
  if (!isBrowserNotificationEnabled()) return;
  if (shouldSuppressMessageAlert(params.conversationId)) return;

  try {
    const notification = new Notification(params.title, {
      body: params.body,
      tag: `chat-${params.conversationId}`,
      icon: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      if (window.location.pathname + window.location.search !== params.url) {
        window.location.href = params.url;
      }
      notification.close();
    };
  } catch {
    // Ignore browsers that block notifications without a service worker.
  }
}
