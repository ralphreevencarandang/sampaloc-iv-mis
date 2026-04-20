import React from "react";
import ResidentNavbar from "@/components/ui/ResidentNavbar";
import { requireResidentSession } from "@/lib/resident-session";

export default async function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireResidentSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="flex-1">
        <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
