import { useParams } from "react-router-dom";
import { Chat } from "../pages/Chat";

/** Remount chat when switching groups so no state leaks between conversations. */
export function ChatRoute() {
  const { conversationId } = useParams<{ conversationId: string }>();
  return <Chat key={conversationId} />;
}
