import { redirect } from "next/navigation";

export default function Home() {
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");

  if (frontendUrl && !frontendUrl.includes("localhost")) {
    redirect(frontendUrl);
  }

  const apiBase =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.API_PUBLIC_URL ?? "http://localhost:3000";

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "system-ui",
        maxWidth: "640px",
        lineHeight: 1.6,
      }}
    >
      <h1>Chat App API</h1>
      <p>Backend is running. This URL serves REST APIs only — not the chat UI.</p>

      <ul>
        <li>
          <strong>Frontend URL:</strong>{" "}
          {frontendUrl ?? (
            <em>Set FRONTEND_URL in env (your Vite app URL on Vercel)</em>
          )}
        </li>
        <li>
          <strong>API base:</strong> {apiBase}
        </li>
      </ul>

      {frontendUrl && (
        <p>
          <a href={frontendUrl}>Open chat app →</a>
        </p>
      )}

      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        Deploy the <code>frontend/</code> folder as a separate Vercel project.
        Set <code>VITE_API_URL</code> and <code>VITE_WS_URL</code> to this
        backend URL.
      </p>
    </main>
  );
}
