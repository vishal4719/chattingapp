import { prisma } from "../lib/prisma";

async function main() {
  const conversations = await prisma.conversation.findMany({
    where: { workspaceAdminId: null },
    select: { id: true, createdByAdminId: true },
  });

  for (const conv of conversations) {
    const creator = await prisma.admin.findUnique({
      where: { id: conv.createdByAdminId },
    });
    const workspaceId = creator?.workspaceAdminId ?? conv.createdByAdminId;

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { workspaceAdminId: workspaceId },
    });
  }

  console.log(`Backfilled workspaceAdminId on ${conversations.length} conversations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
