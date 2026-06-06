import type { Conversation } from "../lib/api";

interface Props {
  conversation: Conversation;
  expanded: boolean;
  onToggle: () => void;
  onCopyLink: () => void;
  onOpenChat: () => void;
  onDemolish: () => void;
  copyLabel: string;
}

export function ConversationCard({
  conversation,
  expanded,
  onToggle,
  onCopyLink,
  onOpenChat,
  onDemolish,
  copyLabel,
}: Props) {
  const isDestroyed = !!conversation.destroyedAt;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                conversation.type === "GROUP"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {conversation.type}
            </span>
            {isDestroyed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                DESTROYED
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold mt-1">{conversation.title}</h3>
          <p className="text-sm text-slate-400 mt-1">
            ID: <span className="font-mono">{conversation.id}</span>
          </p>
          <p className="text-sm text-slate-400">
            {conversation.participantCount} participants ·{" "}
            {conversation.messageCount} messages
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isDestroyed && (
            <>
              <button
                onClick={onOpenChat}
                className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600/80 hover:bg-emerald-600 transition"
              >
                Open Chat
              </button>
              <button
                onClick={onCopyLink}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                {copyLabel}
              </button>
              <button
                onClick={onDemolish}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600/80 hover:bg-red-600 transition"
              >
                Demolish
              </button>
            </>
          )}
          <button
            onClick={onToggle}
            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600/80 hover:bg-indigo-600 transition"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
