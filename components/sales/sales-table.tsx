"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import type { Sale } from "@/types/application";
import { formatCurrency, formatDateTime, toCsv } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SalesTableProps {
  sales: Sale[];
  count: number;
  page: number;
  pageSize: number;
  currency: string;
  timezone: string;
  filters: Record<string, string | undefined>;
}

export function SalesTable({ sales, count, page, pageSize, currency, timezone, filters }: SalesTableProps) {
  const router = useRouter();
  const current = useSearchParams();
  const navigate = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(current.toString());
    Object.entries(updates).forEach(([key, value]) => value ? params.set(key, String(value)) : params.delete(key));
    router.push(`/sales?${params.toString()}`);
  };
  const exportCsv = () => {
    const csv = toCsv(sales.map((sale) => ({
      invoice: sale.invoice_number,
      date: formatDateTime(sale.sold_at, timezone),
      customer: sale.customers?.name ?? "Walk-in",
      cashier: sale.profiles?.full_name ?? "",
      total: sale.total_amount,
      paid: sale.amount_paid,
      payment_status: sale.payment_status,
      sale_status: sale.sale_status,
    })));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <form className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(4,auto)_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input name="search" defaultValue={filters.search} placeholder="Invoice, customer, or cashier" className="pl-8" />
        </div>
        <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All payments</option><option value="paid">Paid</option><option value="partially_paid">Partially paid</option><option value="unpaid">Unpaid</option><option value="refunded">Refunded</option>
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
        </select>
        <Input type="date" name="startDate" defaultValue={filters.startDate} aria-label="Start date" />
        <Input type="date" name="endDate" defaultValue={filters.endDate} aria-label="End date" />
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={!sales.length}><Download /> CSV</Button>
        </div>
      </form>
      <Table>
        <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Cashier</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {sales.length ? sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell><Link href={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">{sale.invoice_number}</Link></TableCell>
              <TableCell>{formatDateTime(sale.sold_at, timezone)}</TableCell>
              <TableCell>{sale.customers?.name ?? "Walk-in"}</TableCell>
              <TableCell>{sale.profiles?.full_name ?? "—"}</TableCell>
              <TableCell className="font-medium">{formatCurrency(sale.total_amount, currency)}</TableCell>
              <TableCell><StatusBadge status={sale.payment_status} /></TableCell>
              <TableCell><StatusBadge status={sale.sale_status} /></TableCell>
            </TableRow>
          )) : <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No sales match these filters.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={(next) => navigate({ page: next })} />
    </div>
  );
}
