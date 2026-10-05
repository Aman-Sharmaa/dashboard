import { Metadata } from "next";
import DebtsClient from "@/components/debts-client";
import { requireFeatureAccess } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Debts | Finance",
  description: "Track money taken and given",
};

export default async function DebtsPage() {
  await requireFeatureAccess("debts");
  return <DebtsClient />;
}
