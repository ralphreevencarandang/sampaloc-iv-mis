import "server-only";

import { NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-authorization";
import type { AdminAction, AdminResource } from "@/lib/rbac";

export async function forbiddenUnlessAdminCan(
  resource: AdminResource,
  action: AdminAction = "read"
) {
  if (await hasAdminPermission(resource, action)) {
    return null;
  }

  return NextResponse.json(
    { success: false, message: "You do not have permission to access this resource." },
    { status: 403 }
  );
}
