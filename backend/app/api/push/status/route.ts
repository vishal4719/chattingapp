import { NextRequest } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getAccountPushTokens, getPushProjectId, isPushConfigured } from "@/lib/push";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const user = requireUser(req);
  const admin = requireAdmin(req);

  if (!user && !admin) {
    return errorResponse("Unauthorized", 401);
  }

  const tokens = await getAccountPushTokens({
    userId: user?.userId,
    adminId: admin?.adminId,
  });

  return jsonResponse({
    configured: isPushConfigured(),
    registered: tokens.length > 0,
    tokenCount: tokens.length,
    firebaseProjectId: getPushProjectId(),
    expectedAndroidProjectId: "chatapp-692a7",
    platforms: [...new Set(tokens.map((entry) => entry.platform))],
    lastUpdatedAt: tokens[0]?.updatedAt.toISOString() ?? null,
  });
}
