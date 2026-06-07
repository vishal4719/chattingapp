import { Avatar } from "./Avatar";
import { formatChatTime } from "../lib/avatar";

interface Participant {
  id: string;
  displayName: string;
  phone: string;
  joinedAt: string;
}

interface Props {
  participant: Participant;
  onClose: () => void;
  onMessage: () => void;
  loading?: boolean;
  error?: string;
}

export function DirectChatModal({
  participant,
  onClose,
  onMessage,
  loading,
  error,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm bg-[var(--wa-panel)] rounded-xl border border-[var(--wa-border)] shadow-xl overflow-hidden">
        <div className="flex flex-col items-center px-6 py-8 bg-[var(--wa-header)] border-b border-[var(--wa-border)]">
          <Avatar name={participant.displayName} size="xl" />
          <h3 className="text-xl font-normal mt-4">{participant.displayName}</h3>
          <p className="text-sm text-[var(--wa-text-secondary)] mt-1">
            {participant.phone}
          </p>
          <p className="text-xs text-[var(--wa-text-secondary)] mt-2">
            Joined {formatChatTime(participant.joinedAt)}
          </p>
        </div>

        <div className="p-4 space-y-2">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onMessage}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
            {loading ? "Opening chat..." : "Message privately"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
