function requiredVite(name: string): string {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to frontend/.env (see frontend/.env.example) or Vercel environment variables, then rebuild.`
    );
  }
  return value.replace(/\/$/, "");
}

export function getApiUrl(): string {
  return requiredVite("VITE_API_URL");
}

export function getWsUrl(): string {
  return requiredVite("VITE_WS_URL");
}

export function getPollIntervalMs(): number {
  const raw = import.meta.env.VITE_POLL_INTERVAL_MS?.trim();
  if (!raw) return 3000;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 3000;
}
