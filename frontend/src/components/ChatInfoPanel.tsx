import { Avatar } from "./Avatar";
import { formatChatTime, getAvatarColor } from "../lib/avatar";

interface Participant {
  id: string;
  displayName: string;
  phone: string;
  joinedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  type: "GROUP" | "DIRECT";
  participants: Participant[];
  you: Participant;
  createdAt: string;
  messageCount: number;
}

export function ChatInfoPanel({
  open,
  onClose,
  title,
  type,
  participants,
  you,
  createdAt,
  messageCount,
}: Props) {
  if (!open) return null;

  const isGroup = type === "GROUP";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md h-full bg-[var(--wa-panel)] overflow-y-auto wa-scrollbar animate-[slideIn_0.2s_ease]">
        <header className="h-[60px] px-4 flex items-center gap-6 bg-[var(--wa-header)] sticky top-0 z-10">
          <button
            onClick={onClose}
            className="text-[var(--wa-text-secondary)] hover:text-white p-1"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h2 className="text-[19px] font-normal">
            {isGroup ? "Group info" : "Contact info"}
          </h2>
        </header>

        <div className="flex flex-col items-center py-7 bg-[var(--wa-header)] border-b border-[var(--wa-border)]">
          <Avatar name={title} size="xl" />
          <h3 className="text-2xl font-normal mt-4 px-4 text-center">{title}</h3>
          <p className="text-sm text-[var(--wa-text-secondary)] mt-1">
            {isGroup
              ? `Group · ${participants.length} participants`
              : "Direct chat"}
          </p>
        </div>

        <section className="py-3 border-b border-[var(--wa-border)]">
          <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
            {isGroup ? "Group details" : "Chat details"}
          </p>
          <div className="px-6 py-2 space-y-3">
            <div>
              <p className="text-xs text-[var(--wa-text-secondary)]">Created</p>
              <p className="text-[15px]">{formatChatTime(createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--wa-text-secondary)]">Messages</p>
              <p className="text-[15px]">{messageCount}</p>
            </div>
          </div>
        </section>

        <section className="py-3 border-b border-[var(--wa-border)]">
          <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
            Your profile
          </p>
          <div className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--wa-hover)]">
            <Avatar name={you.displayName} size="md" />
            <div>
              <p className="text-[17px]">{you.displayName} (You)</p>
              <p className="text-sm text-[var(--wa-text-secondary)]">{you.phone}</p>
            </div>
          </div>
        </section>

        {isGroup && (
          <section className="py-3">
            <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
              {participants.length} participants
            </p>
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--wa-hover)]"
              >
                <Avatar name={p.displayName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] truncate">
                    {p.displayName}
                    {p.id === you.id && (
                      <span className="text-[var(--wa-text-secondary)] text-sm ml-1">
                        (You)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[var(--wa-text-secondary)]">{p.phone}</p>
                </div>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getAvatarColor(p.displayName) }}
                  title={`Joined ${formatChatTime(p.joinedAt)}`}
                />
              </div>
            ))}
          </section>
        )}

        {!isGroup && participants.length > 0 && (
          <section className="py-3">
            <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
              Contact
            </p>
            {participants
              .filter((p) => p.id !== you.id)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--wa-hover)]"
                >
                  <Avatar name={p.displayName} size="md" />
                  <div>
                    <p className="text-[17px]">{p.displayName}</p>
                    <p className="text-sm text-[var(--wa-text-secondary)]">{p.phone}</p>
                    <p className="text-xs text-[var(--wa-text-secondary)] mt-0.5">
                      Joined {formatChatTime(p.joinedAt)}
                    </p>
                  </div>
                </div>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}
