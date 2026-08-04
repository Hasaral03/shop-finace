import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getCustomersReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function CustomersReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/customers");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getCustomersReport(range);
  if (!result.success) reportError(result);
  const rows = [...result.data].sort((a, b) => b.periodSpent - a.periodSpent);
  const active = rows.filter((row) => row.periodSales > 0);
  return (
    <ReportShell title="Customers report" description="Customer sales and spending in the selected period." {...range}
      timezone={timezone}
      totals={[
        { label: "Customers", value: rows.length.toLocaleString() },
        { label: "Active in period", value: active.length.toLocaleString() },
        { label: "Period sales", value: active.reduce((sum, row) => sum + row.periodSales, 0).toLocaleString() },
        { label: "Period spend", value: formatCurrency(active.reduce((sum, row) => sum + row.periodSpent, 0), currency) },
      ]}
      exportName="customers-report"
      exportRows={rows.map((row) => ({ customer: row.name, phone: row.phone ?? "", email: row.email ?? "", sales: row.periodSales, spent: row.periodSpent, balance: row.current_balance }))}>
      <TopProductsChart
        title="Top customers by spend"
        data={active.slice(0, 10).map((row) => ({ name: row.name, value: row.periodSpent }))}
        valueLabel="Spend"
      />
      <ReportTable rows={rows} rowKey={(row) => row.id} columns={[
        { key: "customer", label: "Customer", render: (row) => row.name },
        { key: "contact", label: "Contact", render: (row) => row.phone ?? row.email ?? "—" },
        { key: "sales", label: "Sales", align: "right", render: (row) => row.periodSales.toLocaleString() },
        { key: "spent", label: "Spent", align: "right", render: (row) => formatCurrency(row.periodSpent, currency) },
        { key: "balance", label: "Balance", align: "right", render: (row) => formatCurrency(row.current_balance, currency) },
      ]} />
    </ReportShell>
  );
}
