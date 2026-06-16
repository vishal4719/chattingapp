import { useEffect } from "react";
import { initNotifications, isNativeApp } from "../lib/notifications";

export function NotificationsBootstrap() {
  useEffect(() => {
    if (isNativeApp()) return;
    initNotifications().catch(() => undefined);
  }, []);

  return null;
}
