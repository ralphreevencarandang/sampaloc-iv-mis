import { notFound } from "next/navigation";
import { getHouseholdDetailsAction } from "@/server/actions/household.actions";
import HouseholdDetailsClient from "./household-details-client";

export default async function HouseholdDetailsPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params;
  const result = await getHouseholdDetailsAction(householdId);
  if (!result.success) notFound();
  return <HouseholdDetailsClient household={result.household} />;
}
