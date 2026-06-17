/** Tracks which chat is open so we can skip duplicate alerts while the user is reading it. */
let activeConversationId: string | null = null;

export function setActiveConversationId(conversationId: string | null): void {
  activeConversationId = conversationId;
}

export function shouldSuppressMessageAlert(conversationId: string): boolean {
  return (
    document.visibilityState === "visible" &&
    activeConversationId !== null &&
    activeConversationId === conversationId
  );
}
