"use client";

import { Download, History } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatDateTime, formatNumber, toCsv } from "@/lib/formatting";
import type { StockMovement } from "@/types/application";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  opening_stock: "Opening stock",
  purchase: "Purchase",
  sale: "Sale",
  sale_return: "Sale return",
  purchase_return: "Purchase return",
  damaged: "Damaged",
  expired: "Expired",
  adjustment: "Adjustment",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

interface StockMovementsTableProps {
  movements: StockMovement[];
  timezone: string;
  count: number;
  page: number;
  pageSize: number;
}

export function StockMovementsTable({ movements, timezone, count, page, pageSize }: StockMovementsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const changePage = (next: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", String(next));
    router.push(`${pathname}?${query}`);
  };

  function exportCsv() {
    const csv = toCsv(movements.map((movement) => ({
      Date: formatDateTime(movement.created_at, timezone),
      Product: movement.products?.name ?? "Unknown product",
      Type: labels[movement.movement_type] ?? movement.movement_type,
      Change: movement.quantity_change,
      Before: movement.quantity_before,
      After: movement.quantity_after,
      Note: movement.note ?? "",
    })));
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "stock-movements.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (movements.length === 0) {
    return <EmptyState icon={History} title="No stock movements" description="No inventory changes match the selected filters." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button type="button" variant="outline" onClick={exportCsv}><Download /> Export CSV</Button></div>
      <div className="grid gap-3 md:hidden">
        {movements.map((movement) => (
          <div key={movement.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-medium">{movement.products?.name ?? "Unknown product"}</p><p className="text-xs text-muted-foreground">{formatDateTime(movement.created_at, timezone)}</p></div>
              <Badge variant="outline">{labels[movement.movement_type] ?? movement.movement_type}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-muted-foreground">Before</p><p>{formatNumber(movement.quantity_before)}</p></div>
              <div><p className="text-muted-foreground">Change</p><p className={cn("font-medium", movement.quantity_change > 0 ? "text-success" : "text-destructive")}>{movement.quantity_change > 0 ? "+" : ""}{formatNumber(movement.quantity_change)}</p></div>
              <div><p className="text-muted-foreground">After</p><p>{formatNumber(movement.quantity_after)}</p></div>
            </div>
            {movement.note ? <p className="mt-3 text-sm text-muted-foreground">{movement.note}</p> : null}
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Before</TableHead><TableHead className="text-right">Change</TableHead><TableHead className="text-right">After</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>{formatDateTime(movement.created_at, timezone)}</TableCell>
                <TableCell className="font-medium">{movement.products?.name ?? "Unknown product"}</TableCell>
                <TableCell><Badge variant="outline">{labels[movement.movement_type] ?? movement.movement_type}</Badge></TableCell>
                <TableCell className="text-right">{formatNumber(movement.quantity_before)}</TableCell>
                <TableCell className={cn("text-right font-medium", movement.quantity_change > 0 ? "text-success" : "text-destructive")}>{movement.quantity_change > 0 ? "+" : ""}{formatNumber(movement.quantity_change)}</TableCell>
                <TableCell className="text-right">{formatNumber(movement.quantity_after)}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{movement.note || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={changePage} />
      </div>
      <div className="md:hidden"><DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={changePage} /></div>
    </div>
  );
}
