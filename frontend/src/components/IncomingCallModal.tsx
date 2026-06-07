import { Avatar } from "./Avatar";
import type { IncomingCallPayload } from "../lib/calls";

interface Props {
  call: IncomingCallPayload;
  chatTitle: string;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function IncomingCallModal({
  call,
  chatTitle,
  onAccept,
  onDecline,
  loading,
}: Props) {
  const isVideo = call.callType === "video";

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div className="relative w-full max-w-sm bg-[var(--wa-panel)] rounded-xl border border-[var(--wa-border)] overflow-hidden shadow-2xl animate-[slideIn_0.2s_ease]">
        <div className="flex flex-col items-center px-6 py-8 bg-[var(--wa-header)] border-b border-[var(--wa-border)]">
          <div className="relative">
            <Avatar name={call.callerName} size="xl" />
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--wa-green)] flex items-center justify-center">
              {isVideo ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
                </svg>
              )}
            </span>
          </div>
          <h3 className="text-xl font-normal mt-4">{call.callerName}</h3>
          <p className="text-sm text-[var(--wa-text-secondary)] mt-1 text-center">
            Incoming {isVideo ? "video" : "voice"} call
            <br />
            <span className="text-[var(--wa-green)]">{chatTitle}</span>
          </p>
        </div>

        <div className="p-4 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="flex-1 py-3 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-medium disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="flex-1 py-3 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] text-white font-medium disabled:opacity-50"
          >
            {loading ? "Joining..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
