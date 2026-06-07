import { useEffect } from "react";
import { initNotifications } from "../lib/notifications";

export function NotificationsBootstrap() {
  useEffect(() => {
    initNotifications().catch(() => undefined);
  }, []);

  return null;
}
