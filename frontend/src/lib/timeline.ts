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

export function isPendingMessage(item: ChatItem): boolean {
  return !isJoinNotification(item) && item.id.startsWith("temp-");
}

export function upsertMessage(items: ChatItem[], msg: ChatMessage): ChatItem[] {
  const existing = items.find(
    (i) => !isJoinNotification(i) && i.id === msg.id
  ) as ChatMessage | undefined;

  if (existing) {
    return items.map((i) =>
      !isJoinNotification(i) && i.id === msg.id ? { ...i, ...msg, pending: false } : i
    );
  }

  const withoutMatchingPending = items.filter((i) => {
    if (isJoinNotification(i)) return true;
    if (
      !msg.pending &&
      isPendingMessage(i) &&
      i.content === msg.content &&
      i.participant.id === msg.participant.id
    ) {
      return false;
    }
    return true;
  });

  return buildTimeline(
    [...withoutMatchingPending.filter((i) => !isJoinNotification(i)), msg] as ChatMessage[],
    withoutMatchingPending.filter(isJoinNotification) as JoinNotification[]
  );
}

export function removeMessageById(items: ChatItem[], messageId: string): ChatItem[] {
  return items.filter((i) => isJoinNotification(i) || i.id !== messageId);
}

export function mergePolledTimeline(
  current: ChatItem[],
  messages: ChatMessage[],
  joinEvents: JoinNotification[]
): ChatItem[] {
  const serverTimeline = buildTimeline(messages, joinEvents);
  const pending = current.filter(isPendingMessage) as ChatMessage[];

  if (pending.length === 0) {
    return serverTimeline;
  }

  const stillPending = pending.filter((p) => {
    const sent = serverTimeline.some(
      (i) =>
        !isJoinNotification(i) &&
        i.participant.id === p.participant.id &&
        i.content === p.content &&
        Math.abs(new Date(i.createdAt).getTime() - new Date(p.createdAt).getTime()) < 60_000
    );
    return !sent;
  });

  if (stillPending.length === 0) {
    return serverTimeline;
  }

  return buildTimeline(
    [...serverTimeline.filter((i) => !isJoinNotification(i)), ...stillPending] as ChatMessage[],
    serverTimeline.filter(isJoinNotification) as JoinNotification[]
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
