import { NextRequest } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isPushConfigured, sendTestPush } from "@/lib/push";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest) {
  if (!isPushConfigured()) {
    return errorResponse("Push notifications are not configured", 503);
  }

  const user = requireUser(req);
  const admin = requireAdmin(req);

  if (!user && !admin) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const result = await sendTestPush({
      userId: user?.userId,
      adminId: admin?.adminId,
    });
    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send test notification";
    return errorResponse(message, 400);
  }
}
