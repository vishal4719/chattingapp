import type { ChatItem, ChatMessage, JoinNotification } from "./api";
import { isJoinNotification } from "./api";

export function buildTimeline(
  messages: ChatMessage[],
  joinEvents: JoinNotification[]
): ChatItem[] {
  const items: ChatItem[] = [...messages, ...joinEvents];

  return items.sort((a, b) => {
    const timeA = isJoinNotification(a) ? a.joinedAt : a.createdAt;
    const timeB = isJoinNotification(b) ? b.joinedAt : b.createdAt;
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });
}

export function upsertMessage(items: ChatItem[], msg: ChatMessage): ChatItem[] {
  const existing = items.find(
    (i) => !isJoinNotification(i) && i.id === msg.id
  ) as ChatMessage | undefined;

  if (existing) {
    return items.map((i) =>
      !isJoinNotification(i) && i.id === msg.id ? { ...i, ...msg } : i
    );
  }

  return buildTimeline(
    [...items.filter((i) => !isJoinNotification(i)), msg] as ChatMessage[],
    items.filter(isJoinNotification) as JoinNotification[]
  );
}

export function updateMessageStatus(
  items: ChatItem[],
  messageId: string,
  status: import("./api").MessageStatus
): ChatItem[] {
  return items.map((item) => {
    if (isJoinNotification(item)) return item;
    if (item.id === messageId) {
      return { ...item, status };
    }
    return item;
  });
}

export function upsertJoinEvent(
  items: ChatItem[],
  event: JoinNotification
): ChatItem[] {
  if (items.some((i) => i.id === event.id)) return items;
  return buildTimeline(
    items.filter((i) => !isJoinNotification(i)) as ChatMessage[],
    [...items.filter(isJoinNotification), event] as JoinNotification[]
  );
}
