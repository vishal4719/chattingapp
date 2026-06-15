import { useEffect, useRef } from "react";
import type { ChatItem } from "../lib/api";
import { isCallNotification, isJoinNotification } from "../lib/api";
import { formatMessageTime, getAvatarColor } from "../lib/avatar";
import { Avatar } from "./Avatar";
import { TypingIndicator } from "./TypingIndicator";
import { MessageStatusTicks } from "./MessageStatusTicks";
import { AttachmentBubble, isAttachmentMessage } from "./AttachmentBubble";
import { ReplyQuote } from "./ReplyQuote";
import { SwipeToReply } from "./SwipeToReply";
import type { ChatMessage } from "../lib/api";

interface Props {
  items: ChatItem[];
  currentParticipantId: string;
  isGroup: boolean;
  typingNames?: string[];
  conversationId: string;
  participantToken: string;
  className?: string;
  onReply?: (message: ChatMessage) => void;
}

export function MessageList({
  items,
  currentParticipantId,
  isGroup,
  typingNames = [],
  conversationId,
  participantToken,
  className = "",
  onReply,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items, typingNames.length]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 min-h-0 overflow-y-auto wa-scrollbar wa-chat-bg px-[6%] py-3 max-md:pt-[72px] space-y-0.5 ${className}`}
    >
      {items.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="bg-[#182229]/90 text-[var(--wa-text-secondary)] text-sm px-4 py-2 rounded-lg shadow">
            Messages are end-to-end stored. Send a message to start.
          </div>
        </div>
      )}

      {items.map((item, index) => {
        if (isJoinNotification(item)) {
          return (
            <div key={item.id} className="flex justify-center my-3">
              <span className="text-xs text-[var(--wa-text-secondary)] bg-[#182229]/80 px-3 py-1.5 rounded-lg shadow-sm">
                {item.displayName} joined the group
              </span>
            </div>
          );
        }

        if (isCallNotification(item)) {
          return (
            <div key={item.id} className="flex justify-center my-3">
              <span className="text-xs text-[var(--wa-text-secondary)] bg-[#182229]/80 px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[90%]">
                {item.text}
              </span>
            </div>
          );
        }

        const isOwn = item.participant.id === currentParticipantId;
        const prev = items[index - 1];
        const showAvatar =
          isGroup &&
          !isOwn &&
          (!prev ||
            isJoinNotification(prev) ||
            isCallNotification(prev) ||
            (!isJoinNotification(prev) &&
              !isCallNotification(prev) &&
              prev.participant.id !== item.participant.id));

        return (
          <div
            key={item.id}
            className={`group flex ${isOwn ? "justify-end" : "justify-start"} ${
              showAvatar ? "mt-2" : "mt-0.5"
            }`}
          >
            {!isOwn && isGroup && (
              <div className="w-8 shrink-0 mr-2 self-end">
                {showAvatar ? (
                  <Avatar name={item.participant.displayName} size="sm" className="!w-8 !h-8 !text-xs" />
                ) : null}
              </div>
            )}

            <SwipeToReply
              message={item}
              isOwn={isOwn}
              onReply={onReply}
              className={`max-w-[65%] ${onReply ? "group/msg" : ""}`}
            >
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(item)}
                  className={`absolute top-1 z-10 p-1.5 rounded-full bg-[var(--wa-header)] text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)] shadow opacity-0 max-md:hidden md:group-hover/msg:opacity-100 transition ${
                    isOwn ? "-left-9" : "-right-9"
                  }`}
                  aria-label="Reply"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-9.1-11-11.1z" />
                  </svg>
                </button>
              )}
              <div
                className={`relative px-2 py-1.5 pb-2 shadow-sm ${
                  isOwn
                    ? "bg-[var(--wa-green-dark)] rounded-lg rounded-tr-none"
                    : "bg-[var(--wa-incoming)] rounded-lg rounded-tl-none"
                }`}
              >
              {item.replyTo && (
                <ReplyQuote reply={item.replyTo} isOwnBubble={isOwn} />
              )}
              {isGroup && !isOwn && showAvatar && (
                <p
                  className="text-[13px] font-medium mb-0.5 px-1"
                  style={{ color: getAvatarColor(item.participant.displayName) }}
                >
                  {item.participant.displayName}
                </p>
              )}
              {isAttachmentMessage(item) ? (
                <AttachmentBubble
                  message={item}
                  conversationId={conversationId}
                  participantToken={participantToken}
                />
              ) : (
                <p className="text-[14.2px] leading-[19px] break-words whitespace-pre-wrap px-1 text-[#e9edef]">
                  {item.content}
                </p>
              )}
              <div className="flex items-center justify-end gap-0.5 mt-0.5 px-1 -mb-0.5">
                <span className="text-[11px] text-[var(--wa-text-secondary)]">
                  {formatMessageTime(item.createdAt)}
                </span>
                {isOwn && (
                  <MessageStatusTicks status={item.status} pending={item.pending} />
                )}
              </div>
              </div>
            </SwipeToReply>
          </div>
        );
      })}
      {typingNames.length > 0 && (
        <TypingIndicator displayName={typingNames[0]} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
