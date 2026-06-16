import { Outlet, useParams } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import { NotificationBanner } from "./NotificationBanner";
import { InstallBanner } from "./InstallBanner";
import { isNativeApp } from "../lib/notifications";

export function WhatsAppLayout() {
  const { conversationId } = useParams();

  return (
    <div className="app-shell flex flex-col bg-[var(--wa-bg)] overflow-hidden">
      {!isNativeApp() && <InstallBanner />}
      <NotificationBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden w-full">
      <div
        className={`${
          conversationId ? "hidden md:flex" : "flex"
        } h-full min-h-0 shrink-0 w-full md:w-auto flex-1 md:flex-none`}
      >
        <ChatSidebar />
      </div>

      <main
        className={`flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden w-full ${
          conversationId ? "flex" : "hidden md:flex"
        }`}
      >
        <Outlet />
      </main>
      </div>
    </div>
  );
}
