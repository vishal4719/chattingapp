import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initFcm, isNativeApp } from "../lib/fcm";

export function FcmBootstrap() {
  const location = useLocation();

  // Re-run when route changes (e.g. login → dashboard) so FCM registers after auth exists.
  useEffect(() => {
    if (!isNativeApp()) return;
    initFcm().catch(() => undefined);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNativeApp()) return;

    function onAuthChanged() {
      initFcm().catch(() => undefined);
    }

    window.addEventListener("storage", onAuthChanged);
    window.addEventListener("pandamind:auth-changed", onAuthChanged);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        initFcm().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("storage", onAuthChanged);
      window.removeEventListener("pandamind:auth-changed", onAuthChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
