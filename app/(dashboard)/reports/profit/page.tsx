import { TrendChart } from "@/components/dashboard/trend-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getProfitReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function ProfitReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/profit");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getProfitReport(range);
  if (!result.success) reportError(result);
  const data = result.data;
  return (
    <ReportShell title="Profit report" description="Gross and net profitability for completed sales." {...range}
      timezone={timezone}
      totals={[
        { label: "Revenue", value: formatCurrency(data.revenue, currency) },
        { label: "Cost of goods", value: formatCurrency(data.cogs, currency) },
        { label: "Gross profit", value: formatCurrency(data.grossProfit, currency) },
        { label: "Net profit", value: formatCurrency(data.netProfit, currency) },
      ]}
      exportName="profit-report"
      exportRows={data.daily.map((row) => ({ ...row }))}>
      <TrendChart
        title="Daily profit"
        data={data.daily.map((row) => ({
          period_date: row.date,
          revenue: row.revenue,
          gross_profit: row.grossProfit,
          expenses: 0,
        }))}
      />
      <ReportTable rows={data.daily} rowKey={(row) => row.date} columns={[
        { key: "date", label: "Date", render: (row) => formatDate(row.date, timezone) },
        { key: "sales", label: "Sales", align: "right", render: (row) => row.salesCount.toLocaleString() },
        { key: "revenue", label: "Revenue", align: "right", render: (row) => formatCurrency(row.revenue, currency) },
        { key: "cogs", label: "COGS", align: "right", render: (row) => formatCurrency(row.cogs, currency) },
        { key: "profit", label: "Gross profit", align: "right", render: (row) => formatCurrency(row.grossProfit, currency) },
      ]} />
      <p className="text-sm text-muted-foreground">
        Period expenses: {formatCurrency(data.expenses, currency)}
      </p>
    </ReportShell>
  );
}
