import { TrendChart } from "@/components/dashboard/trend-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getRevenueReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function RevenueReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/revenue");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getRevenueReport(range);
  if (!result.success) reportError(result);
  const rows = result.data.daily;
  return (
    <ReportShell title="Revenue report" description="Completed sales revenue by day." {...range}
      timezone={timezone}
      totals={[
        { label: "Revenue", value: formatCurrency(result.data.totalRevenue, currency) },
        { label: "Completed sales", value: result.data.salesCount.toLocaleString() },
        { label: "Average sale", value: formatCurrency(result.data.salesCount ? result.data.totalRevenue / result.data.salesCount : 0, currency) },
      ]}
      exportName="revenue-report"
      exportRows={rows.map((row) => ({ date: row.date, sales: row.count, revenue: row.amount }))}>
      <TrendChart
        title="Daily revenue"
        data={rows.map((row) => ({ period_date: row.date, revenue: row.amount, gross_profit: 0, expenses: 0 }))}
      />
      <ReportTable rows={rows} rowKey={(row) => row.date} columns={[
        { key: "date", label: "Date", render: (row) => formatDate(row.date, timezone) },
        { key: "count", label: "Sales", align: "right", render: (row) => row.count.toLocaleString() },
        { key: "amount", label: "Revenue", align: "right", render: (row) => formatCurrency(row.amount, currency) },
      ]} />
    </ReportShell>
  );
}
