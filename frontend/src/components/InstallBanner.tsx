import { useEffect, useState } from "react";
import {
  hasDeferredInstallPrompt,
  isIosSafari,
  isStandalone,
  promptInstall,
  subscribeToInstallPrompt,
} from "../lib/pwa";

const DISMISS_KEY = "install-banner-dismissed";

function useInstallBannerState() {
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const sync = () => {
      setCanPromptInstall(hasDeferredInstallPrompt());
    };

    sync();

    if (isIosSafari()) {
      setShowIosHint(true);
    }

    return subscribeToInstallPrompt(sync);
  }, []);

  return { canPromptInstall, showIosHint };
}

export function InstallBanner() {
  const { canPromptInstall, showIosHint } = useInstallBannerState();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setVisible(false);
      return;
    }
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setVisible(false);
      return;
    }
    setVisible(canPromptInstall || showIosHint);
  }, [canPromptInstall, showIosHint]);

  if (!visible) return null;

  async function handleInstall() {
    setLoading(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="shrink-0 px-3 py-2 bg-[var(--wa-blue)]/15 border-b border-[var(--wa-blue)]/30 flex items-center gap-3 text-sm md:hidden">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--wa-blue)" className="shrink-0">
        <path d="M17 18H7v-2h10v2zM19 9h-1V7c0-1.66-1.34-3-3-3H9C7.34 4 6 5.34 6 7v2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-5 0H10V7h4v2z" />
      </svg>
      <div className="flex-1 min-w-0 text-[var(--wa-text)]">
        {canPromptInstall ? (
          <p>Install PandaMind for quick access from your home screen.</p>
        ) : (
          <p>
            Install PandaMind: tap <span className="font-medium">Share</span>, then{" "}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        )}
      </div>
      {canPromptInstall ? (
        <button
          type="button"
          onClick={handleInstall}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 rounded-md bg-[var(--wa-blue)] text-white text-xs font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Install"}
        </button>
      ) : null}
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
