"use client";

import { Download, Package, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { calcUnitMargin, calcUnitProfit } from "@/lib/calculations";
import { formatCurrency, formatNumber, toCsv } from "@/lib/formatting";
import type { Product } from "@/types/application";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type StockStatus } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ProductRow = Omit<Product, "cost_price"> & { cost_price: number | null };

interface ProductsTableProps {
  products: ProductRow[];
  categoryNames: Record<string, string>;
  currency: string;
  canViewCost: boolean;
  count: number;
  page: number;
  pageSize: number;
}

function stockStatus(product: ProductRow): StockStatus {
  if (!product.track_inventory) return "in_stock";
  if (product.stock_quantity <= 0) return "out_of_stock";
  if (product.stock_quantity <= product.minimum_stock) return "low_stock";
  return "in_stock";
}

export function ProductsTable(props: ProductsTableProps) {
  const { products, categoryNames, currency, canViewCost, count, page, pageSize } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", String(nextPage));
    router.push(`${pathname}?${query.toString()}`);
  }

  function exportCsv() {
    const csv = toCsv(products.map((product) => ({
      Name: product.name,
      SKU: product.sku ?? "",
      Category: product.category_id ? categoryNames[product.category_id] ?? "" : "",
      "Selling price": product.selling_price,
      ...(canViewCost ? {
        "Cost price": product.cost_price ?? 0,
        "Profit per unit": calcUnitProfit(product.selling_price, product.cost_price ?? 0),
        "Margin percent": calcUnitMargin(product.selling_price, product.cost_price ?? 0),
        "Stock value": product.stock_quantity * (product.cost_price ?? 0),
      } : {}),
      Stock: product.stock_quantity,
      Unit: product.unit,
      Status: stockStatus(product).replaceAll("_", " "),
    })));
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (products.length === 0) {
    return <EmptyState icon={Package} title="No products found" description="Try different filters or add your first product." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
      </div>
      <div className="grid gap-3 md:hidden">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku || "No SKU"} · {product.category_id ? categoryNames[product.category_id] ?? "Uncategorized" : "Uncategorized"}</p>
              </div>
              <StatusBadge status={stockStatus(product)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Price</p><p>{formatCurrency(product.selling_price, currency)}</p></div>
              <div><p className="text-muted-foreground">Stock</p><p>{product.track_inventory ? `${formatNumber(product.stock_quantity)} ${product.unit}` : "Not tracked"}</p></div>
              {canViewCost ? <div><p className="text-muted-foreground">Profit / unit</p><p>{formatCurrency(calcUnitProfit(product.selling_price, product.cost_price ?? 0), currency)}</p></div> : null}
              {canViewCost ? <div><p className="text-muted-foreground">Margin</p><p>{calcUnitMargin(product.selling_price, product.cost_price ?? 0).toFixed(1)}%</p></div> : null}
            </div>
            <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")} href={`/products/${product.id}`}><Pencil /> Edit</Link>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              {canViewCost ? <TableHead className="text-right">Cost</TableHead> : null}
              {canViewCost ? <TableHead className="text-right">Profit / unit</TableHead> : null}
              {canViewCost ? <TableHead className="text-right">Margin</TableHead> : null}
              <TableHead className="text-right">Stock</TableHead>
              {canViewCost ? <TableHead className="text-right">Stock value</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const cost = product.cost_price ?? 0;
              return (
                <TableRow key={product.id}>
                  <TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || product.barcode || "No SKU"}</p></TableCell>
                  <TableCell>{product.category_id ? categoryNames[product.category_id] ?? "Uncategorized" : "Uncategorized"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.selling_price, currency)}</TableCell>
                  {canViewCost ? <TableCell className="text-right">{formatCurrency(cost, currency)}</TableCell> : null}
                  {canViewCost ? <TableCell className="text-right">{formatCurrency(calcUnitProfit(product.selling_price, cost), currency)}</TableCell> : null}
                  {canViewCost ? <TableCell className="text-right">{calcUnitMargin(product.selling_price, cost).toFixed(1)}%</TableCell> : null}
                  <TableCell className="text-right">{product.track_inventory ? `${formatNumber(product.stock_quantity)} ${product.unit}` : "—"}</TableCell>
                  {canViewCost ? <TableCell className="text-right">{formatCurrency(product.stock_quantity * cost, currency)}</TableCell> : null}
                  <TableCell><StatusBadge status={stockStatus(product)} /></TableCell>
                  <TableCell><Link className={buttonVariants({ variant: "ghost", size: "icon-sm" })} href={`/products/${product.id}`} aria-label={`Edit ${product.name}`}><Pencil /></Link></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={goToPage} />
      </div>
      <div className="md:hidden">
        <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={goToPage} />
      </div>
    </div>
  );
}
