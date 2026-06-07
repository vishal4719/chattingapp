import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, syncUserConversations } from "../lib/api";
import {
  clearAllParticipantSessions,
  clearUserSession,
  saveUserSession,
} from "../lib/storage";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      try {
        const { token, user } = await api.userLogin(email.trim(), password);
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        saveUserSession(token, user);
        await syncUserConversations();
        navigate(redirect);
        return;
      } catch (userErr) {
        if (!(userErr instanceof ApiError) || userErr.status !== 401) {
          throw userErr;
        }
      }

      const { token, admin } = await api.login(email.trim(), password);
      clearUserSession();
      clearAllParticipantSessions();
      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminUser", JSON.stringify(admin));
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--wa-bg)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--wa-green)] mb-4">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-light text-[var(--wa-text)]">Sign in</h1>
          <p className="text-[var(--wa-text-secondary)] text-sm mt-2">
            Users go to chats · Admins go to the dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--wa-panel)] rounded-lg p-6 space-y-4 border border-[var(--wa-border)]"
        >
          <div>
            <label className="block text-xs text-[var(--wa-green)] mb-1 uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg bg-[var(--wa-input)] px-4 py-2.5 text-[var(--wa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--wa-green)] mb-1 uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-[var(--wa-input)] px-4 py-2.5 text-[var(--wa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--wa-green)] hover:bg-[#06cf9c] disabled:opacity-50 transition font-medium text-white"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-sm text-[var(--wa-text-secondary)]">
            No account?{" "}
            <Link
              to={`/register${redirect !== "/dashboard" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="text-[var(--wa-green)] hover:underline"
            >
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
