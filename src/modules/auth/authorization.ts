import { prisma } from "@/lib/db/prisma";
import type { PermissionKey } from "./permissions";

export type Actor = { userId?: string; apiClientId?: string; scopes?: string[] };

export async function userHasPermission(userId: string, permission: PermissionKey, formDefinitionId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      roles: { select: { role: { select: { id: true, permissions: { select: { permission: { select: { key: true } } } } } } } },
    },
  });
  if (!user?.isActive) return false;
  if (user.roles.some((r) => r.role.permissions.some((p) => p.permission.key === permission))) return true;
  if (!formDefinitionId) return false;
  const roleIds = user.roles.map((r) => r.role.id);
  const grant = await prisma.formPermissionGrant.findFirst({
    where: {
      formDefinitionId,
      permission: { key: permission },
      OR: [{ userId }, ...(roleIds.length ? [{ roleId: { in: roleIds } }] : [])],
    },
    select: { id: true },
  });
  return Boolean(grant);
}

export async function requirePermission(userId: string, permission: PermissionKey, formDefinitionId?: string) {
  if (!(await userHasPermission(userId, permission, formDefinitionId))) throw new Error("FORBIDDEN");
}

export async function accessibleFormIds(userId: string, permission: PermissionKey) {
  const global = await userHasPermission(userId, permission);
  if (global) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: { select: { roleId: true } } } });
  const roleIds = user?.roles.map((r) => r.roleId) ?? [];
  const grants = await prisma.formPermissionGrant.findMany({
    where: { permission: { key: permission }, OR: [{ userId }, ...(roleIds.length ? [{ roleId: { in: roleIds } }] : [])] },
    select: { formDefinitionId: true },
  });
  return [...new Set(grants.map((g) => g.formDefinitionId))];
}
