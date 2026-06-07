import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "ChatApp";
const DEFAULT_TITLE = `${SITE_NAME} — Group Chat, Direct Messages & Video Calls`;
const DEFAULT_DESCRIPTION =
  "Modern messaging with group chats, private DMs, video calls, voice calls, and screen sharing.";

const ROUTE_META: Record<string, { title: string; description?: string }> = {
  "/login": {
    title: `Sign In | ${SITE_NAME}`,
    description: "Sign in to ChatApp for group chat, direct messages, and video calls.",
  },
  "/register": {
    title: `Create Account | ${SITE_NAME}`,
    description: "Register for ChatApp to join groups and message privately.",
  },
  "/dashboard": {
    title: `Chats | ${SITE_NAME}`,
    description: "Your conversations — group chats and direct messages.",
  },
  "/admin-dashboard": {
    title: `Admin | ${SITE_NAME}`,
    description: "Manage groups, invite links, and chat settings.",
  },
};

function getMetaForPath(pathname: string) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith("/chat/")) {
    return {
      title: `Chat | ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
    };
  }
  if (pathname.startsWith("/join/")) {
    return {
      title: `Join Group | ${SITE_NAME}`,
      description: "Accept an invite and join a group on ChatApp.",
    };
  }
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = getMetaForPath(pathname);
    document.title = meta.title;

    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute("content", meta.description ?? DEFAULT_DESCRIPTION);
  }, [pathname]);

  return null;
}
