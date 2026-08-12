import { prisma } from "@/lib/db/prisma";
export async function audit(args: { actorUserId?: string; apiClientId?: string; action: string; entityType: string; entityId?: string; metadata?: unknown }) {
  await prisma.auditEvent.create({ data: { ...args, metadata: args.metadata as object | undefined } });
}
