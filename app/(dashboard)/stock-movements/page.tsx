import { Filter } from "lucide-react";

import { getStockMovements } from "@/lib/actions/inventory";
import { listProducts } from "@/lib/actions/products";
import { requireRouteAccess } from "@/lib/auth";
import { StockMovementsTable } from "@/components/inventory/stock-movements-table";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const text = (input: string | string[] | undefined, fallback = "") => typeof input === "string" ? input : fallback;

function inclusiveEnd(date: string) {
  if (!date) return undefined;
  const end = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime())) return date;
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

export default async function StockMovementsPage({ searchParams }: { searchParams: SearchParams }) {
  const { shop } = await requireRouteAccess("/stock-movements");
  const params = await searchParams;
  const productId = text(params.product);
  const movementType = text(params.type);
  const startDate = text(params.start);
  const endDate = text(params.end);
  const page = Math.max(1, Number(text(params.page, "1")) || 1);
  const [movements, products] = await Promise.all([
    getStockMovements({
      productId: productId || undefined,
      movementType: movementType || undefined,
      startDate: startDate || undefined,
      endDate: inclusiveEnd(endDate),
      page,
      pageSize: 25,
    }),
    listProducts({ pageSize: 100, active: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Stock movements" description="Audit every sale, purchase, transfer, and manual stock change." />
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[1fr_200px_160px_160px_auto]">
        <select name="product" defaultValue={productId} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="">All products</option>
          {products.success ? products.data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>) : null}
        </select>
        <select name="type" defaultValue={movementType} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="">All movement types</option>
          <option value="opening_stock">Opening stock</option><option value="purchase">Purchase</option><option value="sale">Sale</option><option value="sale_return">Sale return</option><option value="purchase_return">Purchase return</option><option value="damaged">Damaged</option><option value="expired">Expired</option><option value="adjustment">Adjustment</option><option value="transfer_in">Transfer in</option><option value="transfer_out">Transfer out</option>
        </select>
        <Input type="date" name="start" defaultValue={startDate} aria-label="Start date" />
        <Input type="date" name="end" defaultValue={endDate} aria-label="End date" />
        <button type="submit" className={cn(buttonVariants(), "w-full")}><Filter /> Apply</button>
      </form>
      {!movements.success ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{movements.error}</div>
      ) : (
        <StockMovementsTable movements={movements.data.movements} timezone={shop?.timezone ?? "Asia/Colombo"} count={movements.data.count} page={movements.data.page} pageSize={movements.data.pageSize} />
      )}
    </div>
  );
}
