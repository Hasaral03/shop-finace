import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getSuppliersReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function SuppliersReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/suppliers");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getSuppliersReport(range);
  if (!result.success) reportError(result);
  const rows = [...result.data].sort((a, b) => b.periodPurchased - a.periodPurchased);
  const active = rows.filter((row) => row.periodPurchases > 0);
  return (
    <ReportShell title="Suppliers report" description="Purchasing activity by supplier." {...range}
      timezone={timezone}
      totals={[
        { label: "Suppliers", value: rows.length.toLocaleString() },
        { label: "Used in period", value: active.length.toLocaleString() },
        { label: "Purchases", value: active.reduce((sum, row) => sum + row.periodPurchases, 0).toLocaleString() },
        { label: "Purchased", value: formatCurrency(active.reduce((sum, row) => sum + row.periodPurchased, 0), currency) },
      ]}
      exportName="suppliers-report"
      exportRows={rows.map((row) => ({ supplier: row.name, contact: row.contact_person ?? "", phone: row.phone ?? "", purchases: row.periodPurchases, purchased: row.periodPurchased, balance: row.current_balance }))}>
      <TopProductsChart
        title="Purchases by supplier"
        data={active.slice(0, 10).map((row) => ({ name: row.name, value: row.periodPurchased }))}
        valueLabel="Purchased"
      />
      <ReportTable rows={rows} rowKey={(row) => row.id} columns={[
        { key: "supplier", label: "Supplier", render: (row) => row.name },
        { key: "contact", label: "Contact", render: (row) => row.contact_person ?? row.phone ?? "—" },
        { key: "purchases", label: "Purchases", align: "right", render: (row) => row.periodPurchases.toLocaleString() },
        { key: "purchased", label: "Purchased", align: "right", render: (row) => formatCurrency(row.periodPurchased, currency) },
        { key: "balance", label: "Balance", align: "right", render: (row) => formatCurrency(row.current_balance, currency) },
      ]} />
    </ReportShell>
  );
}
