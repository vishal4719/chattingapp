import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, syncAdminConversations, syncUserConversations } from "../lib/api";
import {
  clearAllParticipantSessions,
  clearUserSession,
  saveUserSession,
} from "../lib/storage";
import { PasswordInput } from "../components/PasswordInput";
import { AppLogo } from "../components/AppLogo";
import { initFcm } from "../lib/fcm";

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
        window.dispatchEvent(new Event("pandamind:auth-changed"));
        void initFcm();
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
      await syncAdminConversations();
      window.dispatchEvent(new Event("pandamind:auth-changed"));
      void initFcm();
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="native-page min-h-screen flex items-center justify-center p-4 bg-[var(--wa-bg)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <AppLogo size={88} className="mx-auto mb-4" />
          <h1 className="text-2xl font-light text-[var(--wa-text)]">Sign in to PandaMind</h1>
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
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
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
