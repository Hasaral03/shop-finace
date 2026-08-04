import { requireRouteAccess } from "@/lib/auth";
import { getSales } from "@/lib/actions/sales";
import { PageHeader } from "@/components/shared/page-header";
import { SalesTable } from "@/components/sales/sales-table";

type Params = Record<string, string | string[] | undefined>;
const value = (input: string | string[] | undefined) => typeof input === "string" ? input : undefined;

export default async function SalesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [{ shop }, query] = await Promise.all([requireRouteAccess("/sales"), searchParams]);
  const filters = {
    search: value(query.search), status: value(query.status) as "completed" | "pending" | "cancelled" | "refunded" | undefined,
    paymentStatus: value(query.paymentStatus) as "paid" | "partially_paid" | "unpaid" | "refunded" | undefined,
    startDate: value(query.startDate), endDate: value(query.endDate), page: Number(value(query.page) ?? 1), pageSize: 20,
  };
  const result = await getSales(filters);
  if (!result.success) throw new Error(result.error);
  return <div className="space-y-6">
    <PageHeader title="Sales" description="Search transactions, review payment status, and export the current result set." />
    <SalesTable {...result.data} currency={shop?.currency ?? "LKR"} timezone={shop?.timezone ?? "Asia/Colombo"} filters={{ search: filters.search, status: filters.status, paymentStatus: filters.paymentStatus, startDate: filters.startDate, endDate: filters.endDate }} />
  </div>;
}
