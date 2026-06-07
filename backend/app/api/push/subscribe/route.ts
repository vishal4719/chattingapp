import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isPushConfigured } from "@/lib/push";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
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
      return errorResponse("Invalid subscription", 400);
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        userId: user?.userId,
        adminId: admin?.adminId,
      },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        userId: user?.userId ?? null,
        adminId: admin?.adminId ?? null,
      },
    });

    return jsonResponse({ ok: true });
  } catch {
    return errorResponse("Failed to save subscription", 500);
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
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint,
          OR: [
            ...(user ? [{ userId: user.userId }] : []),
            ...(admin ? [{ adminId: admin.adminId }] : []),
          ],
        },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
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
    return errorResponse("Failed to remove subscription", 500);
  }
}
