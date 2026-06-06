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
  if (items.some((i) => !isJoinNotification(i) && i.id === msg.id)) {
    return items;
  }
  return buildTimeline(
    [...items.filter((i) => !isJoinNotification(i)), msg] as ChatMessage[],
    items.filter(isJoinNotification) as JoinNotification[]
  );
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
