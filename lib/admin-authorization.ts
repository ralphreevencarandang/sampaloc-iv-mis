import "server-only";

import { getCurrentAdminFromSession } from "@/lib/admin-session";
import { canAccessResource, type AdminAction, type AdminResource } from "@/lib/rbac";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireAdminPermission(
  resource: AdminResource,
  action: AdminAction = "read"
) {
  const currentAdmin = await getCurrentAdminFromSession();

  if (!currentAdmin || !canAccessResource(currentAdmin.role, resource, action)) {
    throw new AuthorizationError();
  }

  return currentAdmin;
}

export async function hasAdminPermission(resource: AdminResource, action: AdminAction = "read") {
  const currentAdmin = await getCurrentAdminFromSession();
  return Boolean(currentAdmin && canAccessResource(currentAdmin.role, resource, action));
}
