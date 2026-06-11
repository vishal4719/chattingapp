import type { MessageReplyPreview } from "../lib/api";

interface Props {
  reply: MessageReplyPreview;
  isOwnBubble?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function ReplyQuote({
  reply,
  isOwnBubble = false,
  compact = false,
  onClick,
}: Props) {
  const accent = isOwnBubble ? "#53bdeb" : "var(--wa-green)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-md bg-black/20 overflow-hidden mb-1 ${
        onClick ? "cursor-pointer hover:bg-black/30" : "cursor-default"
      } ${compact ? "px-2 py-1" : "px-2 py-1.5"}`}
    >
      <div className="flex gap-2 min-w-0">
        <div
          className="w-1 shrink-0 rounded-full self-stretch"
          style={{ backgroundColor: accent }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium truncate ${compact ? "text-xs" : "text-[13px]"}`}
            style={{ color: accent }}
          >
            {reply.participant.displayName}
          </p>
          <p
            className={`text-[var(--wa-text-secondary)] truncate ${
              compact ? "text-xs" : "text-[13px]"
            }`}
          >
            {reply.content}
          </p>
        </div>
      </div>
    </button>
  );
}
