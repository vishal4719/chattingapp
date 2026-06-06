import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatAdminPublic, getAdminById } from "@/lib/admin-workspace";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const admin = await getAdminById(jwt.adminId);
  if (!admin) return errorResponse("Admin not found", 404);

  return jsonResponse({ admin: formatAdminPublic(admin) });
}
