import { Link } from "react-router-dom";
import { AppLogo } from "../components/AppLogo";

const APK_URL = "/downloads/pandamind.apk";
const APK_FILENAME = "PandaMind.apk";

export function Download() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--wa-bg)]">
      <div className="w-full max-w-md text-center">
        <AppLogo size={96} className="mx-auto mb-6" />

        <h1 className="text-2xl font-light text-[var(--wa-text)] mb-2">
          Download PandaMind for Android
        </h1>
        <p className="text-[var(--wa-text-secondary)] text-sm mb-8">
          Install the app on your phone for the best experience — group chat, direct
          messages, and video calls.
        </p>

        <div className="bg-[var(--wa-panel)] rounded-lg p-6 border border-[var(--wa-border)] space-y-5">
          <a
            href={APK_URL}
            download={APK_FILENAME}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-lg bg-[var(--wa-green)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Download for Android
          </a>

          <div className="text-left text-sm text-[var(--wa-text-secondary)] space-y-3 pt-1">
            <p className="font-medium text-[var(--wa-text)]">How to install</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Tap the download button above</li>
              <li>Open the downloaded file when prompted</li>
              <li>Allow install from this source if Android asks</li>
              <li>Open PandaMind from your app drawer</li>
            </ol>
          </div>
        </div>

        <p className="mt-8 text-sm text-[var(--wa-text-secondary)]">
          On iPhone?{" "}
          <a href="/" className="text-[var(--wa-blue)] hover:underline">
            Use the web app
          </a>{" "}
          and tap Share → Add to Home Screen.
        </p>

        <p className="mt-4 text-sm">
          <Link to="/login" className="text-[var(--wa-blue)] hover:underline">
            Already installed? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
