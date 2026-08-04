import { ReportShell } from "@/components/reports/report-shell";
import { ReportTable } from "@/components/reports/report-table";
import { getInventoryReport } from "@/lib/actions/reports";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { reportError, resolveReportRange, type ReportSearchParams } from "@/lib/reporting";

export default async function InventoryReportPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const { shop } = await requireRouteAccess("/reports/inventory");
  const currency = shop?.currency ?? "LKR";
  const timezone = shop?.timezone ?? "Asia/Colombo";
  const range = await resolveReportRange(searchParams, timezone);
  const result = await getInventoryReport(range);
  if (!result.success) reportError(result);
  const data = result.data;
  return (
    <ReportShell title="Inventory report" description="Current stock position and movement activity." {...range}
      timezone={timezone}
      totals={[
        { label: "Inventory value", value: formatCurrency(data.inventoryValue, currency) },
        { label: "Tracked products", value: data.products.length.toLocaleString() },
        { label: "Low stock", value: data.lowStockCount.toLocaleString() },
        { label: "Out of stock", value: data.outOfStockCount.toLocaleString() },
      ]}
      exportName="inventory-report"
      exportRows={data.products.map((row) => ({
        product: row.name,
        sku: row.sku ?? "",
        quantity: row.stock_quantity,
        minimum_stock: row.minimum_stock,
        cost_price: row.cost_price,
        stock_value: Number(row.stock_quantity) * Number(row.cost_price),
      }))}>
      <ReportTable rows={data.products} rowKey={(row) => row.id} columns={[
        { key: "product", label: "Product", render: (row) => row.name },
        { key: "sku", label: "SKU", render: (row) => row.sku ?? "—" },
        { key: "stock", label: "In stock", align: "right", render: (row) => `${formatNumber(row.stock_quantity)} ${row.unit}` },
        { key: "minimum", label: "Minimum", align: "right", render: (row) => formatNumber(row.minimum_stock) },
        { key: "value", label: "Stock value", align: "right", render: (row) => formatCurrency(Number(row.stock_quantity) * Number(row.cost_price), currency) },
      ]} />
      <p className="text-sm text-muted-foreground">
        {data.movements.length.toLocaleString()} stock movements occurred in this period.
      </p>
    </ReportShell>
  );
}
