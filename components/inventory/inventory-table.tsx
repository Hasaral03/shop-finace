"use client";

import { Package, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatCurrency, formatNumber } from "@/lib/formatting";
import type { Product } from "@/types/application";
import { StockAdjustForm } from "@/components/inventory/stock-adjust-form";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type StockStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function status(product: Product): StockStatus {
  if (product.stock_quantity <= 0) return "out_of_stock";
  if (product.stock_quantity <= product.minimum_stock) return "low_stock";
  return "in_stock";
}

interface InventoryTableProps {
  products: Product[];
  categoryNames: Record<string, string>;
  currency: string;
  count: number;
  page: number;
  pageSize: number;
}

export function InventoryTable({ products, categoryNames, currency, count, page, pageSize }: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const changePage = (next: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", String(next));
    router.push(`${pathname}?${query}`);
  };

  if (products.length === 0) {
    return <EmptyState icon={Package} title="No inventory found" description="No tracked products match these filters." />;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || "No SKU"}</p></div>
              <StatusBadge status={status(product)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Current stock</p><p>{formatNumber(product.stock_quantity)} {product.unit}</p></div>
              <div><p className="text-muted-foreground">Minimum</p><p>{formatNumber(product.minimum_stock)} {product.unit}</p></div>
              <div><p className="text-muted-foreground">Stock value</p><p>{formatCurrency(product.stock_quantity * product.cost_price, currency)}</p></div>
              <div><p className="text-muted-foreground">Category</p><p>{product.category_id ? categoryNames[product.category_id] ?? "Uncategorized" : "Uncategorized"}</p></div>
            </div>
            <StockAdjustForm product={product} trigger={<Button type="button" variant="outline" className="mt-4 w-full"><SlidersHorizontal /> Adjust</Button>} />
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Current stock</TableHead><TableHead className="text-right">Minimum</TableHead><TableHead className="text-right">Inventory value</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || product.barcode || "No SKU"}</p></TableCell>
                <TableCell>{product.category_id ? categoryNames[product.category_id] ?? "Uncategorized" : "Uncategorized"}</TableCell>
                <TableCell className="text-right">{formatNumber(product.stock_quantity)} {product.unit}</TableCell>
                <TableCell className="text-right">{formatNumber(product.minimum_stock)} {product.unit}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.stock_quantity * product.cost_price, currency)}</TableCell>
                <TableCell><StatusBadge status={status(product)} /></TableCell>
                <TableCell><StockAdjustForm product={product} trigger={<Button type="button" size="sm" variant="outline"><SlidersHorizontal /> Adjust</Button>} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={changePage} />
      </div>
      <div className="md:hidden"><DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={changePage} /></div>
    </>
  );
}
