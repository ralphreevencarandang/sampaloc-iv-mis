import { AdminRole, type AdminRole as AdminRoleType } from "@/app/generated/prisma/enums";

export type AdminResource =
  | "dashboard"
  | "announcements"
  | "officials"
  | "residents"
  | "voters"
  | "documents"
  | "blotter"
  | "health"
  | "vawc"
  | "pets"
  | "inventory"
  | "archives";

export type AdminAction = "read" | "write";

export type BarangayAdminRole = Exclude<AdminRoleType, typeof AdminRole.HEALTH_WORKER>;

const ALL_ADMIN_RESOURCES: AdminResource[] = [
  "dashboard",
  "announcements",
  "officials",
  "residents",
  "voters",
  "documents",
  "blotter",
  "health",
  "vawc",
  "pets",
  "inventory",
  "archives",
];

const READABLE_RESOURCES_BY_ROLE: Record<BarangayAdminRole, AdminResource[]> = {
  [AdminRole.ADMIN]: ALL_ADMIN_RESOURCES,
  [AdminRole.CLERK]: ["announcements", "officials", "voters", "documents"],
  [AdminRole.PEACE_AND_ORDER]: ["blotter", "vawc"],
  [AdminRole.PUNONG_BARANGAY]: ALL_ADMIN_RESOURCES,
  [AdminRole.SK]: ["announcements"],
};

const WRITABLE_RESOURCES_BY_ROLE: Record<BarangayAdminRole, AdminResource[]> = {
  [AdminRole.ADMIN]: ALL_ADMIN_RESOURCES,
  [AdminRole.CLERK]: ["announcements", "officials", "voters", "documents"],
  [AdminRole.PEACE_AND_ORDER]: ["blotter", "vawc"],
  [AdminRole.PUNONG_BARANGAY]: [],
  [AdminRole.SK]: ["announcements"],
};

const DEFAULT_ROUTE_BY_ROLE: Record<BarangayAdminRole, string> = {
  [AdminRole.ADMIN]: "/admin",
  [AdminRole.CLERK]: "/admin/documents",
  [AdminRole.PEACE_AND_ORDER]: "/admin/blotter",
  [AdminRole.PUNONG_BARANGAY]: "/admin",
  [AdminRole.SK]: "/admin/announcements",
};

export function isBarangayAdminRole(
  role?: AdminRoleType | string | null
): role is BarangayAdminRole {
  if (!role || role === AdminRole.HEALTH_WORKER) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(READABLE_RESOURCES_BY_ROLE, role);
}

export function canAccessResource(
  role?: AdminRoleType | string | null,
  resource?: AdminResource | null,
  action: AdminAction = "read"
): boolean {
  if (!role || !resource || !isBarangayAdminRole(role)) {
    return false;
  }

  const allowedResources =
    action === "write" ? WRITABLE_RESOURCES_BY_ROLE[role] : READABLE_RESOURCES_BY_ROLE[role];

  return Array.isArray(allowedResources) && allowedResources.includes(resource);
}

export function getReadableResources(role?: AdminRoleType | string | null): AdminResource[] {
  return role && isBarangayAdminRole(role) ? (READABLE_RESOURCES_BY_ROLE[role] ?? []) : [];
}

export function getDefaultAdminRoute(role?: AdminRoleType | string | null): string {
  return role && isBarangayAdminRole(role) ? (DEFAULT_ROUTE_BY_ROLE[role] ?? "/admin") : "/AdminLogin";
}

export function isReadOnlyAdmin(role?: AdminRoleType | string | null): boolean {
  return role === AdminRole.PUNONG_BARANGAY;
}

export function getResourceForAdminPath(pathname: string): AdminResource | null {
  if (pathname === "/admin" || pathname === "/admin/") {
    return "dashboard";
  }

  if (pathname.startsWith("/admin/announcements")) return "announcements";
  if (pathname.startsWith("/admin/officials")) return "officials";
  if (pathname.startsWith("/admin/resident")) return "residents";
  if (pathname.startsWith("/admin/voters")) return "voters";
  if (pathname.startsWith("/admin/documents")) return "documents";
  if (pathname.startsWith("/admin/blotter")) return "blotter";
  if (pathname.startsWith("/admin/health")) return "health";
  if (pathname.startsWith("/admin/vawc")) return "vawc";
  if (pathname.startsWith("/admin/pets")) return "pets";
  if (pathname.startsWith("/admin/inventory")) return "inventory";
  if (pathname.startsWith("/admin/archived")) return "archives";

  return null;
}
