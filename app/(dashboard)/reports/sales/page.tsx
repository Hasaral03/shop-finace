import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getSalesReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: ReportSearchParams;
}) {
  const { shop } = await requireRouteAccess("/reports/sales");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getSalesReport(range);
  if (!result.success) reportError(result);
  const rows = result.data.rows;
  return (
    <ReportShell
      title="Sales report"
      description="Sales invoices recorded during the selected period."
      {...range}
      timezone={timezone}
      totals={[
        { label: "Sales", value: result.data.count.toLocaleString() },
        { label: "Sales total", value: formatCurrency(result.data.total, currency) },
      ]}
      exportName="sales-report"
      exportRows={rows.map((sale) => ({
        invoice: sale.invoice_number,
        date: formatDateTime(sale.sold_at, timezone),
        customer: sale.customers?.name ?? "Walk-in",
        status: sale.sale_status,
        payment_status: sale.payment_status,
        total: sale.total_amount,
      }))}
    >
      <ReportTable
        rows={rows}
        rowKey={(sale) => sale.id}
        columns={[
          { key: "invoice", label: "Invoice", render: (sale) => sale.invoice_number },
          { key: "date", label: "Date", render: (sale) => formatDateTime(sale.sold_at, timezone) },
          { key: "customer", label: "Customer", render: (sale) => sale.customers?.name ?? "Walk-in" },
          { key: "status", label: "Status", render: (sale) => sale.sale_status },
          { key: "payment", label: "Payment", render: (sale) => sale.payment_status },
          { key: "total", label: "Total", align: "right", render: (sale) => formatCurrency(sale.total_amount, currency) },
        ]}
      />
    </ReportShell>
  );
}
