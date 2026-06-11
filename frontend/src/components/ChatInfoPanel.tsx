import { useState } from "react";
import { Avatar } from "./Avatar";
import { formatChatTime, getAvatarColor } from "../lib/avatar";
import { DirectChatModal } from "./DirectChatModal";

interface Participant {
  id: string;
  displayName: string;
  phone: string;
  joinedAt: string;
  canDirectMessage?: boolean;
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
  canExport?: boolean;
  onExport?: () => Promise<void>;
  onLeave?: () => Promise<void>;
  onDirectChat?: (targetParticipantId: string) => Promise<void>;
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
  canExport,
  onExport,
  onLeave,
  onDirectChat,
}: Props) {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(
    null
  );
  const [leaving, setLeaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [directLoading, setDirectLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  if (!open) return null;

  const isGroup = type === "GROUP";

  async function handleLeave() {
    if (!onLeave) return;
    if (!confirm("Leave this group? You can rejoin with the invite link.")) return;

    setLeaving(true);
    try {
      await onLeave();
      onClose();
    } finally {
      setLeaving(false);
    }
  }

  async function handleDirectChat() {
    if (!selectedParticipant || !onDirectChat) return;

    setDirectLoading(true);
    setActionError("");
    try {
      await onDirectChat(selectedParticipant.id);
      setSelectedParticipant(null);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not start private chat"
      );
    } finally {
      setDirectLoading(false);
    }
  }

  async function handleExport() {
    if (!onExport) return;

    setExporting(true);
    setActionError("");
    try {
      await onExport();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not export chat"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
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

          {canExport && onExport && (
            <section className="py-3 border-b border-[var(--wa-border)]">
              <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
                Export chat
              </p>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-[var(--wa-hover)] disabled:opacity-50"
              >
                <span className="text-[var(--wa-text-secondary)]">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px]">
                    {exporting ? "Exporting..." : "Export chat"}
                  </p>
                  <p className="text-sm text-[var(--wa-text-secondary)]">
                    Download all messages as a text file
                  </p>
                </div>
              </button>
            </section>
          )}

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
            <section className="py-3 border-b border-[var(--wa-border)]">
              <p className="px-6 py-2 text-sm text-[var(--wa-green)] uppercase tracking-wide">
                {participants.length} participants
              </p>
              {participants.map((p) => {
                const isYou = p.id === you.id;
                const canMessage = !isYou && onDirectChat;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!canMessage}
                    onClick={() => canMessage && setSelectedParticipant(p)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                      canMessage
                        ? "hover:bg-[var(--wa-hover)] cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <Avatar name={p.displayName} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] truncate">
                        {p.displayName}
                        {isYou && (
                          <span className="text-[var(--wa-text-secondary)] text-sm ml-1">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--wa-text-secondary)]">{p.phone}</p>
                    </div>
                    {canMessage && (
                      <span className="p-2 rounded-full text-[var(--wa-green)] shrink-0">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                        </svg>
                      </span>
                    )}
                    {isYou && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getAvatarColor(p.displayName) }}
                      />
                    )}
                  </button>
                );
              })}
            </section>
          )}

          {!isGroup && participants.length > 0 && (
            <section className="py-3 border-b border-[var(--wa-border)]">
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

          {actionError && (
            <section className="px-6 py-2">
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                {actionError}
              </p>
            </section>
          )}

          {onLeave && isGroup && (
            <section className="py-4 px-6 space-y-3">
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                className="w-full py-3 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50 font-medium"
              >
                {leaving ? "Leaving..." : "Leave group"}
              </button>
            </section>
          )}
        </div>
      </div>

      {selectedParticipant && (
        <DirectChatModal
          participant={selectedParticipant}
          onClose={() => {
            setSelectedParticipant(null);
            setActionError("");
          }}
          onMessage={handleDirectChat}
          loading={directLoading}
          error={actionError}
        />
      )}
    </>
  );
}
