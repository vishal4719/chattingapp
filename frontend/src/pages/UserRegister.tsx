import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { saveUserSession } from "../lib/storage";
import { PasswordInput } from "../components/PasswordInput";
import { initFcm } from "../lib/fcm";

export function UserRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token, user } = await api.userRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      saveUserSession(token, user);
      window.dispatchEvent(new Event("pandamind:auth-changed"));
      void initFcm();
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-light text-[var(--wa-text)]">Create account</h1>
          <p className="text-[var(--wa-text-secondary)] text-sm mt-2">
            Sign up to join groups and chat
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--wa-panel)] rounded-lg p-6 space-y-4 border border-[var(--wa-border)]"
        >
          <div>
            <label className="block text-xs text-[var(--wa-green)] mb-1 uppercase">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              autoComplete="name"
              className="w-full rounded-lg bg-[var(--wa-input)] px-4 py-2.5 text-[var(--wa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
            />
          </div>
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
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              minLength={5}
              maxLength={20}
              autoComplete="tel"
              placeholder="+91 98765 43210"
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
              minLength={6}
              autoComplete="new-password"
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
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[var(--wa-text-secondary)]">
            Already have an account?{" "}
            <Link
              to={`/login${redirect !== "/dashboard" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="text-[var(--wa-green)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
