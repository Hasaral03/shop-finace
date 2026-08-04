import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getExpensesReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function ExpensesReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/expenses");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getExpensesReport(range);
  if (!result.success) reportError(result);
  const rows = result.data.rows;
  const categories = Object.entries(result.data.byCategory);
  return (
    <ReportShell title="Expenses report" description="Operating expenses by date and category." {...range}
      timezone={timezone}
      totals={[
        { label: "Total expenses", value: formatCurrency(result.data.total, currency) },
        { label: "Entries", value: rows.length.toLocaleString() },
        { label: "Categories", value: categories.length.toLocaleString() },
      ]}
      exportName="expenses-report"
      exportRows={rows.map((row) => ({
        date: row.expense_date,
        category: row.expense_categories?.name ?? "Uncategorized",
        description: row.description,
        payment_method: row.payment_method ?? "",
        amount: row.amount,
      }))}>
      <PaymentMethodChart
        title="Expenses by category"
        data={categories.map(([name, value]) => ({ name, value }))}
      />
      <ReportTable rows={rows} rowKey={(row) => row.id} columns={[
        { key: "date", label: "Date", render: (row) => formatDate(row.expense_date, timezone) },
        { key: "category", label: "Category", render: (row) => row.expense_categories?.name ?? "Uncategorized" },
        { key: "description", label: "Description", render: (row) => row.description },
        { key: "method", label: "Payment", render: (row) => row.payment_method?.replaceAll("_", " ") ?? "—" },
        { key: "amount", label: "Amount", align: "right", render: (row) => formatCurrency(row.amount, currency) },
      ]} />
    </ReportShell>
  );
}
