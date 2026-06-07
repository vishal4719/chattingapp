import { useEffect, useRef } from "react";
import type { ChatItem } from "../lib/api";
import { isJoinNotification } from "../lib/api";
import { formatMessageTime, getAvatarColor } from "../lib/avatar";
import { Avatar } from "./Avatar";
import { TypingIndicator } from "./TypingIndicator";
import { MessageStatusTicks } from "./MessageStatusTicks";
import { AttachmentBubble, isAttachmentMessage } from "./AttachmentBubble";

interface Props {
  items: ChatItem[];
  currentParticipantId: string;
  isGroup: boolean;
  typingNames?: string[];
  conversationId: string;
  participantToken: string;
}

export function MessageList({
  items,
  currentParticipantId,
  isGroup,
  typingNames = [],
  conversationId,
  participantToken,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, typingNames.length]);

  return (
    <div className="flex-1 overflow-y-auto wa-scrollbar wa-chat-bg px-[6%] py-3 space-y-0.5">
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

        const isOwn = item.participant.id === currentParticipantId;
        const prev = items[index - 1];
        const showAvatar =
          isGroup &&
          !isOwn &&
          (!prev ||
            isJoinNotification(prev) ||
            (!isJoinNotification(prev) &&
              prev.participant.id !== item.participant.id));

        return (
          <div
            key={item.id}
            className={`flex ${isOwn ? "justify-end" : "justify-start"} ${
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

            <div
              className={`relative max-w-[65%] px-2 py-1.5 pb-2 shadow-sm ${
                isOwn
                  ? "bg-[var(--wa-green-dark)] rounded-lg rounded-tr-none"
                  : "bg-[var(--wa-incoming)] rounded-lg rounded-tl-none"
              }`}
            >
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
