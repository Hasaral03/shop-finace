import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRouteAccess } from "@/lib/auth";
import { getPurchases } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/shared/page-header";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import { buttonVariants } from "@/components/ui/button";

type Query = Record<string, string | string[] | undefined>;
const text = (value: string | string[] | undefined) => typeof value === "string" ? value : undefined;
export default async function PurchasesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [{ shop }, query] = await Promise.all([requireRouteAccess("/purchases"), searchParams]);
  const display = { search: text(query.search), supplierId: text(query.supplierId), paymentStatus: text(query.paymentStatus), startDate: text(query.startDate), endDate: text(query.endDate) };
  const [result, supplierResult] = await Promise.all([getPurchases({ ...display, paymentStatus: display.paymentStatus as "paid" | "partially_paid" | "unpaid" | undefined, page: Number(text(query.page) ?? 1), pageSize: 20 }), getSuppliers({ active: true, pageSize: 100 })]);
  if (!result.success) throw new Error(result.error);
  return <div className="space-y-6"><PageHeader title="Purchases" description="Track stock receipts and supplier balances." actions={<Link href="/purchases/new" className={buttonVariants()}><Plus /> New purchase</Link>} /><PurchasesTable {...result.data} suppliers={supplierResult.success ? supplierResult.data.suppliers : []} currency={shop?.currency ?? "LKR"} timezone={shop?.timezone ?? "Asia/Colombo"} filters={display} /></div>;
}
