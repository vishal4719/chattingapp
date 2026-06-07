import { Outlet, useParams } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import { NotificationBanner } from "./NotificationBanner";

export function WhatsAppLayout() {
  const { conversationId } = useParams();

  return (
    <div className="h-dvh max-h-dvh flex flex-col bg-[var(--wa-bg)] overflow-hidden">
      <NotificationBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div
        className={`${
          conversationId ? "hidden md:flex" : "flex"
        } h-full min-h-0 shrink-0`}
      >
        <ChatSidebar />
      </div>

      <main
        className={`flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden ${
          conversationId ? "flex" : "hidden md:flex"
        }`}
      >
        <Outlet />
      </main>
      </div>
    </div>
  );
}
