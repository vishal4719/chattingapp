import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isPushConfigured } from "@/lib/push";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const subscribeSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["android", "ios"]).default("android"),
});

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
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid FCM token", 400);
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;

    await prisma.fcmToken.upsert({
      where: { token: parsed.data.token },
      create: {
        token: parsed.data.token,
        platform: parsed.data.platform,
        userAgent,
        userId: user?.userId,
        adminId: admin?.adminId,
      },
      update: {
        platform: parsed.data.platform,
        userAgent,
        userId: user?.userId ?? null,
        adminId: admin?.adminId ?? null,
      },
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[fcm] subscribe failed:", err);
    return errorResponse("Failed to save FCM token", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = requireUser(req);
  const admin = requireAdmin(req);

  if (!user && !admin) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : null;

    if (token) {
      await prisma.fcmToken.deleteMany({
        where: {
          token,
          OR: [
            ...(user ? [{ userId: user.userId }] : []),
            ...(admin ? [{ adminId: admin.adminId }] : []),
          ],
        },
      });
    } else {
      await prisma.fcmToken.deleteMany({
        where: {
          OR: [
            ...(user ? [{ userId: user.userId }] : []),
            ...(admin ? [{ adminId: admin.adminId }] : []),
          ],
        },
      });
    }

    return jsonResponse({ ok: true });
  } catch {
    return errorResponse("Failed to remove FCM token", 500);
  }
}
