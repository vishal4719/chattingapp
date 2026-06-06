import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token, admin } = await api.login(email, password);
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-light text-[var(--wa-text)]">Admin Login</h1>
          <p className="text-[var(--wa-text-secondary)] text-sm mt-2">
            Sign in to manage groups and chats
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
        </form>
      </div>
    </div>
  );
}
