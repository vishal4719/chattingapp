import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, syncUserConversations } from "../lib/api";
import { getUserToken, saveParticipantSession } from "../lib/storage";
import { Avatar } from "../components/Avatar";

export function Join() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{
    id: string;
    type: string;
    title: string;
    inviteToken: string;
    destroyed: boolean;
    alreadyJoined?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    if (!getUserToken()) {
      navigate(`/login?redirect=${encodeURIComponent(`/join/${token}`)}`, {
        replace: true,
      });
      return;
    }

    api
      .getJoinInfo(token)
      .then(setInfo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  async function handleJoin() {
    if (!token) return;

    setJoining(true);
    setError("");

    try {
      const result = await api.joinConversation(token);
      saveParticipantSession(result.conversationId, {
        sessionToken: result.sessionToken,
        participantId: result.participantId,
        displayName: result.displayName,
        title: result.title,
        type: result.type,
      });
      await syncUserConversations();
      navigate(`/chat/${result.conversationId}`, {
        state: {
          conversationId: result.conversationId,
          messages: result.messages,
          joinEvents: result.joinEvents,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  function handleOpenChat() {
    if (!info) return;
    navigate(`/chat/${info.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--wa-bg)] text-[var(--wa-text-secondary)]">
        Loading...
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--wa-bg)] p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-[var(--wa-text-secondary)]">Invalid invite link.</p>
        </div>
      </div>
    );
  }

  if (info?.destroyed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--wa-bg)] p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl text-red-400 mb-2">Group closed</h1>
          <p className="text-[var(--wa-text-secondary)] text-sm">
            This chat was deleted by the admin.
          </p>
          <Link to="/dashboard" className="text-[var(--wa-green)] text-sm mt-4 inline-block">
            Go to chats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--wa-bg)]">
      <div className="w-full max-w-md bg-[var(--wa-panel)] rounded-lg border border-[var(--wa-border)] overflow-hidden">
        <div className="bg-[var(--wa-header)] px-6 py-8 flex flex-col items-center border-b border-[var(--wa-border)]">
          <Avatar name={info?.title ?? "Group"} size="xl" />
          <h1 className="text-xl font-normal mt-4">{info?.title}</h1>
          <p className="text-sm text-[var(--wa-text-secondary)] mt-1">
            {info?.type === "GROUP" ? "WhatsApp Group Invite" : "Direct Chat Invite"}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--wa-text-secondary)] text-center">
            {info?.alreadyJoined
              ? "You are already a member of this group."
              : "You have been invited to join this conversation."}
          </p>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {info?.alreadyJoined ? (
            <button
              type="button"
              onClick={handleOpenChat}
              className="w-full py-2.5 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] transition font-medium text-white"
            >
              Open chat
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-2.5 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] disabled:opacity-50 transition font-medium text-white"
            >
              {joining ? "Joining..." : "Join group"}
            </button>
          )}

          <Link
            to="/dashboard"
            className="block text-center text-sm text-[var(--wa-text-secondary)] hover:text-[var(--wa-green)]"
          >
            Back to chats
          </Link>
        </div>
      </div>
    </div>
  );
}
