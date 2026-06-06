import type { Admin } from "@prisma/client";
import { prisma } from "./prisma";

export function getWorkspaceId(admin: Pick<Admin, "id" | "workspaceAdminId">): string {
  return admin.workspaceAdminId ?? admin.id;
}

export function isWorkspaceOwner(admin: Pick<Admin, "id" | "workspaceAdminId" | "accessType">): boolean {
  return admin.accessType === "INDEPENDENT" && getWorkspaceId(admin) === admin.id;
}

export async function getAdminById(adminId: string) {
  return prisma.admin.findUnique({ where: { id: adminId } });
}

export function getConversationWorkspaceId(conversation: {
  workspaceAdminId: string | null;
  createdByAdminId: string;
}): string {
  return conversation.workspaceAdminId ?? conversation.createdByAdminId;
}

export async function assertWorkspaceConversation(
  conversationId: string,
  admin: Pick<Admin, "id" | "workspaceAdminId">
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return { ok: false as const, error: "Conversation not found", status: 404 };

  if (getConversationWorkspaceId(conversation) !== getWorkspaceId(admin)) {
    return { ok: false as const, error: "Forbidden", status: 403 };
  }

  return { ok: true as const, conversation };
}

export function formatAdminPublic(admin: Admin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    accessType: admin.accessType,
    workspaceAdminId: getWorkspaceId(admin),
    isWorkspaceOwner: isWorkspaceOwner(admin),
    createdAt: admin.createdAt.toISOString(),
  };
}
