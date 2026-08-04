import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getProductsReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function ProductsReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/products");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getProductsReport(range);
  if (!result.success) reportError(result);
  const rows = result.data;
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const profit = rows.reduce((sum, row) => sum + row.grossProfit, 0);
  return (
    <ReportShell title="Products report" description="Product sales volume, revenue, and gross profit." {...range}
      timezone={timezone}
      totals={[
        { label: "Products sold", value: rows.length.toLocaleString() },
        { label: "Units sold", value: formatNumber(rows.reduce((sum, row) => sum + row.quantity, 0)) },
        { label: "Revenue", value: formatCurrency(revenue, currency) },
        { label: "Gross profit", value: formatCurrency(profit, currency) },
      ]}
      exportName="products-report"
      exportRows={rows.map((row) => ({ product: row.name, sku: row.sku ?? "", quantity: row.quantity, revenue: row.revenue, cogs: row.cogs, gross_profit: row.grossProfit }))}>
      <TopProductsChart
        title="Top products by revenue"
        data={rows.slice(0, 10).map((row) => ({ name: row.name, value: row.revenue }))}
        valueLabel="Revenue"
      />
      <ReportTable rows={rows} rowKey={(row, index) => row.productId ?? `${row.name}-${index}`} columns={[
        { key: "product", label: "Product", render: (row) => row.name },
        { key: "sku", label: "SKU", render: (row) => row.sku ?? "—" },
        { key: "quantity", label: "Quantity", align: "right", render: (row) => formatNumber(row.quantity) },
        { key: "revenue", label: "Revenue", align: "right", render: (row) => formatCurrency(row.revenue, currency) },
        { key: "profit", label: "Gross profit", align: "right", render: (row) => formatCurrency(row.grossProfit, currency) },
      ]} />
    </ReportShell>
  );
}
