import { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/auth";

export default async function ProductsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireFeatureAccess("products");
  return <>{children}</>;
}
