import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getPaymentsReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function PaymentsReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/payments");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getPaymentsReport(range);
  if (!result.success) reportError(result);
  const rows = result.data.rows;
  const methods = Object.entries(result.data.byMethod);
  return (
    <ReportShell title="Payments report" description="Payments received during the selected period." {...range}
      timezone={timezone}
      totals={[
        { label: "Collected", value: formatCurrency(result.data.total, currency) },
        { label: "Payments", value: rows.length.toLocaleString() },
        { label: "Methods used", value: methods.length.toLocaleString() },
      ]}
      exportName="payments-report"
      exportRows={rows.map((row) => ({ date: formatDateTime(row.paid_at, timezone), method: row.payment_method, reference: row.reference_number ?? "", amount: row.amount }))}>
      <PaymentMethodChart
        data={methods.map(([name, value]) => ({ name: name.replaceAll("_", " "), value }))}
      />
      <ReportTable rows={rows} rowKey={(row) => row.id} columns={[
        { key: "date", label: "Date", render: (row) => formatDateTime(row.paid_at, timezone) },
        { key: "method", label: "Method", render: (row) => row.payment_method.replaceAll("_", " ") },
        { key: "reference", label: "Reference", render: (row) => row.reference_number ?? "—" },
        { key: "amount", label: "Amount", align: "right", render: (row) => formatCurrency(row.amount, currency) },
      ]} />
    </ReportShell>
  );
}
