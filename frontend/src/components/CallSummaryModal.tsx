import type { CallType } from "../lib/calls";
import { buildCallEventText, formatCallDuration } from "../lib/callSummary";

interface Props {
  callType: CallType;
  durationSeconds: number;
  participantNames: string[];
  isGroup: boolean;
  chatTitle: string;
  onClose: () => void;
}

export function CallSummaryModal({
  callType,
  durationSeconds,
  participantNames,
  isGroup,
  chatTitle,
  onClose,
}: Props) {
  const uniqueNames = [...new Set(participantNames.filter(Boolean))];
  const label = callType === "video" ? "Video call ended" : "Voice call ended";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm bg-[var(--wa-panel)] rounded-xl border border-[var(--wa-border)] overflow-hidden shadow-2xl">
        <div className="px-6 py-8 text-center bg-[var(--wa-header)] border-b border-[var(--wa-border)]">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--wa-green)]/15 text-[var(--wa-green)] flex items-center justify-center mb-4">
            {callType === "video" ? (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
              </svg>
            )}
          </div>
          <h3 className="text-xl font-normal">{label}</h3>
          <p className="text-sm text-[var(--wa-text-secondary)] mt-1">{chatTitle}</p>
          <p className="text-3xl font-light mt-4 tabular-nums">
            {formatCallDuration(durationSeconds)}
          </p>
        </div>

        <div className="px-6 py-4 space-y-2 text-sm text-[var(--wa-text-secondary)]">
          <p>
            <span className="text-[var(--wa-text)]">{uniqueNames.length}</span>{" "}
            {uniqueNames.length === 1 ? "participant" : "participants"}
          </p>
          {uniqueNames.length > 0 && (
            <p className="leading-relaxed">
              {buildCallEventText(callType, durationSeconds, uniqueNames, isGroup)}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[var(--wa-border)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] text-white font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
