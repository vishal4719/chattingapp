import { Outlet, useParams } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";

export function WhatsAppLayout() {
  const { conversationId } = useParams();

  return (
    <div className="h-screen flex bg-[var(--wa-bg)] overflow-hidden">
      <div
        className={`${
          conversationId ? "hidden md:flex" : "flex"
        } h-full`}
      >
        <ChatSidebar />
      </div>

      <main
        className={`flex-1 flex flex-col min-w-0 h-full ${
          conversationId ? "flex" : "hidden md:flex"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
