import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, Conversation, ConversationDetail } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { saveParticipantSession } from "../lib/storage";

export function Dashboard() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copyLabel, setCopyLabel] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const adminUser = JSON.parse(localStorage.getItem("adminUser") ?? "{}");

  async function loadConversations() {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleCreate(type: "GROUP" | "DIRECT") {
    if (!title.trim()) {
      setError("Enter a title first");
      return;
    }

    setCreating(true);
    setError("");
    setExpandedId(null);
    setDetail(null);
    try {
      await api.createConversation(type, title.trim());
      setTitle("");
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(id);
    setDetail(null);
    try {
      const data = await api.getConversation(id);
      if (data.id !== id) return;
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    }
  }

  function handleCopyLink(conv: Conversation) {
    navigator.clipboard.writeText(conv.inviteUrl);
    setCopyLabel((prev) => ({ ...prev, [conv.id]: "Copied!" }));
    setTimeout(() => {
      setCopyLabel((prev) => ({ ...prev, [conv.id]: "Copy link" }));
    }, 2000);
  }

  async function handleDemolish(id: string) {
    if (!confirm("Delete this group? It will be gone for all users forever.")) {
      return;
    }

    try {
      await api.demolishConversation(id);
      setExpandedId(null);
      setDetail(null);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleOpenChat(conv: Conversation) {
    if (conv.destroyedAt) return;

    try {
      const result = await api.adminJoinConversation(conv.id);
      saveParticipantSession(result.conversationId, {
        sessionToken: result.sessionToken,
        participantId: result.participantId,
        displayName: result.displayName,
        title: result.title,
        type: result.type,
        isAdmin: true,
      });
      navigate(`/chat/${result.conversationId}`, {
        state: {
          conversationId: result.conversationId,
          messages: result.messages,
          joinEvents: result.joinEvents,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open chat");
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  }

  const openChats = conversations.filter((c) => !c.destroyedAt);

  return (
    <div className="min-h-screen bg-[var(--wa-bg)]">
      <header className="h-[60px] px-4 flex items-center justify-between bg-[var(--wa-header)] border-b border-[var(--wa-border)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar name={adminUser.name ?? "Admin"} size="sm" />
          <div>
            <h1 className="text-[17px] font-normal">Admin</h1>
            <p className="text-xs text-[var(--wa-text-secondary)]">
              {adminUser.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-[var(--wa-hover)] text-[var(--wa-green)]"
          >
            Open chats
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)]"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <section className="rounded-lg bg-[var(--wa-panel)] border border-[var(--wa-border)] p-4">
          <h2 className="text-sm text-[var(--wa-green)] uppercase mb-3">
            New group
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Group subject"
              className="flex-1 min-w-[200px] rounded-lg bg-[var(--wa-input)] px-4 py-2 text-[var(--wa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
            />
            <button
              onClick={() => handleCreate("GROUP")}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] disabled:opacity-50 text-white text-sm"
            >
              New group
            </button>
            <button
              onClick={() => handleCreate("DIRECT")}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-[var(--wa-hover)] hover:bg-[#374955] disabled:opacity-50 text-sm"
            >
              New chat
            </button>
          </div>
        </section>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <section>
          <h2 className="text-sm text-[var(--wa-green)] uppercase mb-3 px-1">
            Your groups ({openChats.length} open)
          </h2>

          {loading ? (
            <p className="text-[var(--wa-text-secondary)] text-sm px-1">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-[var(--wa-text-secondary)] text-sm px-1">
              No groups yet. Create one above.
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isOpen = !conv.destroyedAt;
                const expanded = expandedId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className="rounded-lg bg-[var(--wa-panel)] border border-[var(--wa-border)] overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <Avatar name={conv.title} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-normal text-[17px] truncate">{conv.title}</p>
                        <p className="text-xs text-[var(--wa-text-secondary)]">
                          {conv.type} · {conv.participantCount} members ·{" "}
                          {conv.messageCount} msgs
                          {!isOpen && " · Deleted"}
                        </p>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="flex flex-wrap gap-2 px-3 pb-3 border-t border-[var(--wa-border)] pt-3">
                        <button
                          onClick={() => handleOpenChat(conv)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-[var(--wa-green)] text-white hover:bg-[#06cf9c]"
                        >
                          Open chat
                        </button>
                        <button
                          onClick={() => handleCopyLink(conv)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-[var(--wa-hover)] hover:bg-[#374955]"
                        >
                          {copyLabel[conv.id] ?? "Copy invite link"}
                        </button>
                        <button
                          onClick={() => handleToggle(conv.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-[var(--wa-hover)] hover:bg-[#374955]"
                        >
                          {expanded ? "Hide info" : "Group info"}
                        </button>
                        <button
                          onClick={() => handleDemolish(conv.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white"
                        >
                          Delete group
                        </button>
                      </div>
                    )}

                    {expanded && detail?.id === conv.id && (
                      <div className="border-t border-[var(--wa-border)] bg-[var(--wa-header)] p-4">
                        <p className="text-xs text-[var(--wa-green)] uppercase mb-3">
                          {detail.participants.length} participants
                        </p>
                        <div className="space-y-2">
                          {detail.participants.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 py-1">
                              <Avatar name={p.displayName} size="sm" />
                              <div>
                                <p className="text-[15px]">{p.displayName}</p>
                                <p className="text-xs text-[var(--wa-text-secondary)]">
                                  {p.phone} · {p.ipAddress}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
