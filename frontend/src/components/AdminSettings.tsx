import { FormEvent, useEffect, useState } from "react";
import { api, Admin } from "../lib/api";

interface Props {
  isWorkspaceOwner: boolean;
}

export function AdminSettings({ isWorkspaceOwner }: Props) {
  const [open, setOpen] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessType, setAccessType] = useState<"SHARED" | "INDEPENDENT">("SHARED");

  useEffect(() => {
    if (open && isWorkspaceOwner) {
      loadAdmins();
    }
  }, [open, isWorkspaceOwner]);

  async function loadAdmins() {
    setLoading(true);
    try {
      const { admins: list } = await api.getWorkspaceAdmins();
      setAdmins(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      await api.createAdmin({ name, email, password, accessType });
      setSuccess(`Admin "${name}" created successfully`);
      setName("");
      setEmail("");
      setPassword("");
      setAccessType("SHARED");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-lg bg-[var(--wa-panel)] border border-[var(--wa-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--wa-hover)] transition text-left"
      >
        <span className="p-2 rounded-full bg-[var(--wa-header)] text-[var(--wa-text-secondary)]">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium">Settings</p>
          <p className="text-xs text-[var(--wa-text-secondary)]">
            {isWorkspaceOwner
              ? "Create admins · same access or new workspace"
              : "Shared admin account · same groups as workspace owner"}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="var(--wa-text-secondary)"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--wa-border)] p-4 space-y-4 bg-[var(--wa-header)]/40">
          {!isWorkspaceOwner ? (
            <p className="text-sm text-[var(--wa-text-secondary)]">
              You are a shared admin. You can see and join the same groups as the
              workspace owner. When you open a chat, you are added as a separate
              participant with your own name.
            </p>
          ) : (
            <>
              <form onSubmit={handleCreate} className="space-y-3">
                <p className="text-xs text-[var(--wa-green)] uppercase tracking-wide">
                  Create new admin
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Display name"
                    required
                    className="rounded-lg bg-[var(--wa-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="rounded-lg bg-[var(--wa-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    required
                    minLength={6}
                    className="rounded-lg bg-[var(--wa-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)] sm:col-span-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wa-border)] cursor-pointer hover:bg-[var(--wa-hover)]">
                    <input
                      type="radio"
                      name="accessType"
                      checked={accessType === "SHARED"}
                      onChange={() => setAccessType("SHARED")}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">Same level access</p>
                      <p className="text-xs text-[var(--wa-text-secondary)] mt-0.5">
                        Shares your groups and chats. Own login. Opening a chat
                        adds them to the group as their own participant.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wa-border)] cursor-pointer hover:bg-[var(--wa-hover)]">
                    <input
                      type="radio"
                      name="accessType"
                      checked={accessType === "INDEPENDENT"}
                      onChange={() => setAccessType("INDEPENDENT")}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">New usage (separate workspace)</p>
                      <p className="text-xs text-[var(--wa-text-secondary)] mt-0.5">
                        Gets their own admin dashboard. They create and manage
                        their own groups and 1-to-1 chats independently.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-[var(--wa-green)] text-white text-sm hover:bg-[#06cf9c] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create admin"}
                </button>
              </form>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-[var(--wa-green)] text-sm bg-[var(--wa-green)]/10 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              <div>
                <p className="text-xs text-[var(--wa-green)] uppercase tracking-wide mb-2">
                  Workspace admins ({admins.length})
                </p>
                {loading ? (
                  <p className="text-sm text-[var(--wa-text-secondary)]">Loading...</p>
                ) : (
                  <div className="space-y-2">
                    {admins.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--wa-panel)] px-3 py-2 border border-[var(--wa-border)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.name}
                            {a.isWorkspaceOwner && (
                              <span className="ml-2 text-[10px] uppercase text-[var(--wa-green)]">
                                Owner
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--wa-text-secondary)] truncate">
                            {a.email}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] uppercase shrink-0 px-2 py-0.5 rounded-full ${
                            a.accessType === "SHARED"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {a.accessType === "SHARED" ? "Shared" : "Independent"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
