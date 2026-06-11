import { getApiUrl } from "./env";

export async function downloadAdminChatExport(
  conversationId: string,
  fallbackTitle: string
): Promise<void> {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    throw new Error("Admin login required");
  }

  const res = await fetch(
    `${getApiUrl()}/api/admin/conversations/${conversationId}/export`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Export failed"
    );
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename =
    match?.[1] ??
  `${fallbackTitle.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "chat_export"}.txt`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
