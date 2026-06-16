import { useEffect, useState } from "react";
import {
  enableFcm,
  getFcmUnsupportedReason,
  isFcmEnabled,
  isNativeApp,
} from "../lib/fcm";

export function FcmBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNativeApp()) return;

    function refreshBanner() {
      isFcmEnabled().then((enabled) => {
        if (enabled) {
          setVisible(false);
          return;
        }
        if (localStorage.getItem("fcm-banner-dismissed") === "1") return;
        setVisible(true);
      });
    }

    refreshBanner();
    window.addEventListener("pandamind:auth-changed", refreshBanner);
    return () => window.removeEventListener("pandamind:auth-changed", refreshBanner);
  }, []);

  if (!isNativeApp() || !visible) return null;

  async function handleEnable() {
    setLoading(true);
    setError("");
    try {
      const ok = await enableFcm();
      if (ok) {
        setVisible(false);
      } else if (localStorage.getItem("fcm-permission-asked") === "1") {
        setError(
          "Notifications allowed on phone, but server push is not configured yet. Add Firebase credentials on AWS backend."
        );
      } else {
        setError(
          getFcmUnsupportedReason() ??
            "Could not enable notifications. Allow permission in phone settings and try again."
        );
      }
    } catch {
      setError("Failed to register for notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem("fcm-banner-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="shrink-0 px-3 py-1.5 bg-[var(--wa-green)]/15 border-b border-[var(--wa-green)]/30 flex items-center gap-2 text-xs md:text-sm">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--wa-green)" className="shrink-0">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--wa-text)]">
          Enable notifications to get message alerts on this phone.
        </p>
        {error ? <p className="text-red-400 text-xs mt-1">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="shrink-0 px-3 py-1.5 rounded-md bg-[var(--wa-green)] text-white text-xs font-medium disabled:opacity-50"
      >
        {loading ? "..." : "Enable"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-[var(--wa-text-secondary)] hover:text-white p-1 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
