import type {
  CallEventNotification,
  ChatItem,
  ChatMessage,
  JoinNotification,
} from "./api";
import { isCallNotification, isJoinNotification } from "./api";

function itemTimestamp(item: ChatItem): string {
  if (isJoinNotification(item)) return item.joinedAt;
  if (isCallNotification(item)) return item.endedAt;
  return item.createdAt;
}

function isSystemEvent(item: ChatItem): boolean {
  return isJoinNotification(item) || isCallNotification(item);
}

export function buildTimeline(
  messages: ChatMessage[],
  joinEvents: JoinNotification[],
  callEvents: CallEventNotification[] = []
): ChatItem[] {
  const items: ChatItem[] = [...messages, ...joinEvents, ...callEvents];

  return items.sort(
    (a, b) =>
      new Date(itemTimestamp(a)).getTime() - new Date(itemTimestamp(b)).getTime()
  );
}

export function isPendingMessage(item: ChatItem): boolean {
  return !isSystemEvent(item) && item.id.startsWith("temp-");
}

export function upsertMessage(items: ChatItem[], msg: ChatMessage): ChatItem[] {
  const existing = items.find(
    (i) => !isSystemEvent(i) && i.id === msg.id
  ) as ChatMessage | undefined;

  if (existing) {
    return items.map((i) =>
      !isSystemEvent(i) && i.id === msg.id ? { ...i, ...msg, pending: false } : i
    );
  }

  const withoutMatchingPending = items.filter((i) => {
    if (isSystemEvent(i)) return true;
    const pendingMsg = i as ChatMessage;
    if (
      !msg.pending &&
      isPendingMessage(pendingMsg) &&
      pendingMsg.content === msg.content &&
      pendingMsg.participant.id === msg.participant.id
    ) {
      return false;
    }
    return true;
  });

  return buildTimeline(
    [...withoutMatchingPending.filter((i) => !isSystemEvent(i)), msg] as ChatMessage[],
    withoutMatchingPending.filter(isJoinNotification) as JoinNotification[],
    withoutMatchingPending.filter(isCallNotification) as CallEventNotification[]
  );
}

export function removeMessageById(items: ChatItem[], messageId: string): ChatItem[] {
  return items.filter((i) => isSystemEvent(i) || i.id !== messageId);
}

export function mergePolledTimeline(
  current: ChatItem[],
  messages: ChatMessage[],
  joinEvents: JoinNotification[]
): ChatItem[] {
  const callEvents = current.filter(isCallNotification) as CallEventNotification[];
  const serverTimeline = buildTimeline(messages, joinEvents, callEvents);
  const pending = current.filter(isPendingMessage) as ChatMessage[];

  if (pending.length === 0) {
    return serverTimeline;
  }

  const stillPending = pending.filter((p) => {
    const sent = serverTimeline.some((i) => {
      if (isSystemEvent(i)) return false;
      const serverMsg = i as ChatMessage;
      return (
        serverMsg.participant.id === p.participant.id &&
        serverMsg.content === p.content &&
        Math.abs(new Date(serverMsg.createdAt).getTime() - new Date(p.createdAt).getTime()) < 60_000
      );
    });
    return !sent;
  });

  if (stillPending.length === 0) {
    return serverTimeline;
  }

  return buildTimeline(
    [...serverTimeline.filter((i) => !isSystemEvent(i)), ...stillPending] as ChatMessage[],
    serverTimeline.filter(isJoinNotification) as JoinNotification[],
    callEvents
  );
}

export function updateMessageStatus(
  items: ChatItem[],
  messageId: string,
  status: import("./api").MessageStatus
): ChatItem[] {
  return items.map((item) => {
    if (isSystemEvent(item)) return item;
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
    items.filter((i) => !isSystemEvent(i)) as ChatMessage[],
    [...items.filter(isJoinNotification), event] as JoinNotification[],
    items.filter(isCallNotification) as CallEventNotification[]
  );
}

export function upsertCallEvent(
  items: ChatItem[],
  event: CallEventNotification
): ChatItem[] {
  if (items.some((i) => i.id === event.id)) return items;
  return buildTimeline(
    items.filter((i) => !isSystemEvent(i)) as ChatMessage[],
    items.filter(isJoinNotification) as JoinNotification[],
    [...items.filter(isCallNotification), event] as CallEventNotification[]
  );
}
