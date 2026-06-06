import { NextRequest } from "next/server";
import { z } from "zod";
import { AdminAccessType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import {
  formatAdminPublic,
  getAdminById,
  getWorkspaceId,
  isWorkspaceOwner,
} from "@/lib/admin-workspace";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  accessType: z.enum(["SHARED", "INDEPENDENT"]),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const admin = await getAdminById(jwt.adminId);
  if (!admin) return errorResponse("Admin not found", 404);

  if (!isWorkspaceOwner(admin)) {
    return errorResponse("Only workspace owners can view admin list", 403);
  }

  const workspaceId = getWorkspaceId(admin);
  const admins = await prisma.admin.findMany({
    where: {
      OR: [{ id: workspaceId }, { workspaceAdminId: workspaceId }],
    },
    orderBy: { createdAt: "asc" },
  });

  return jsonResponse({
    admins: admins.map(formatAdminPublic),
  });
}

export async function POST(req: NextRequest) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const creator = await getAdminById(jwt.adminId);
  if (!creator) return errorResponse("Admin not found", 404);

  if (!isWorkspaceOwner(creator)) {
    return errorResponse("Only workspace owners can create admins", 403);
  }

  try {
    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid admin data", 400);
    }

    const existing = await prisma.admin.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return errorResponse("Email already in use", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const creatorWorkspaceId = getWorkspaceId(creator);

    const accessType = parsed.data.accessType as AdminAccessType;
    const workspaceAdminId =
      accessType === "SHARED" ? creatorWorkspaceId : null;

    const newAdmin = await prisma.admin.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        accessType,
        workspaceAdminId,
        createdByAdminId: creator.id,
      },
    });

    return jsonResponse({
      admin: formatAdminPublic(newAdmin),
    });
  } catch {
    return errorResponse("Failed to create admin", 500);
  }
}
