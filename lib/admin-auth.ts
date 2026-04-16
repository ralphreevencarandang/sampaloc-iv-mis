import "server-only";

import type { AdminRole } from "@/app/generated/prisma/enums";

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};
