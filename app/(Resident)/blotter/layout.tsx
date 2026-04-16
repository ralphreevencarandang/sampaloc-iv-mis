import React from "react";
import { requireResidentSession } from "@/lib/resident-session";

export default async function BlotterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireResidentSession();

  return <>{children}</>;
}
