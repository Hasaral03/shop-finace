import { notFound } from "next/navigation";
import { requireRouteAccess } from "@/lib/auth";
import { getSaleById } from "@/lib/actions/sales";
import { SaleDetail } from "@/components/sales/sale-detail";

export default async function SalePage({ params }: { params: Promise<{ saleId: string }> }) {
  const [{ profile, shop }, { saleId }] = await Promise.all([requireRouteAccess("/sales"), params]);
  const result = await getSaleById(saleId);
  if (!result.success) notFound();
  return <SaleDetail sale={result.data} currency={shop?.currency ?? "LKR"} timezone={shop?.timezone ?? "Asia/Colombo"} canCancel={profile.role === "owner" || profile.role === "manager"} canViewCost={profile.role !== "cashier"} />;
}
