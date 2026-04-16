import React from "react";
import { requireResidentSession } from "@/lib/resident-session";

export default async function PetRegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireResidentSession();

  return <>{children}</>;
}
