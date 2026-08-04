"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Purchase, Supplier } from "@/types/application";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PurchasesTable({ purchases, suppliers, count, page, pageSize, currency, timezone, filters }: {
  purchases: Purchase[]; suppliers: Supplier[]; count: number; page: number; pageSize: number; currency: string; timezone: string; filters: Record<string, string | undefined>;
}) {
  const router = useRouter(); const params = useSearchParams();
  const go = (next: number) => { const query = new URLSearchParams(params); query.set("page", String(next)); router.push(`/purchases?${query}`); };
  return <div className="overflow-hidden rounded-xl border bg-card">
    <form className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-6">
      <Input name="search" defaultValue={filters.search} placeholder="Purchase or supplier invoice" />
      <select name="supplierId" defaultValue={filters.supplierId ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm"><option value="">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
      <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm"><option value="">All payments</option><option value="paid">Paid</option><option value="partially_paid">Partially paid</option><option value="unpaid">Unpaid</option></select>
      <Input type="date" name="startDate" defaultValue={filters.startDate} /><Input type="date" name="endDate" defaultValue={filters.endDate} /><Button type="submit">Filter</Button>
    </form>
    <Table><TableHeader><TableRow><TableHead>Purchase</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{purchases.length ? purchases.map((purchase) => <TableRow key={purchase.id}><TableCell><Link href={`/purchases/${purchase.id}`} className="font-medium text-primary hover:underline">{purchase.purchase_number}</Link><div className="text-xs text-muted-foreground">{purchase.supplier_invoice_number}</div></TableCell><TableCell>{formatDateTime(purchase.purchased_at, timezone)}</TableCell><TableCell>{purchase.suppliers?.name ?? "—"}</TableCell><TableCell>{formatCurrency(purchase.total_amount, currency)}</TableCell><TableCell>{formatCurrency(purchase.balance_amount, currency)}</TableCell><TableCell><StatusBadge status={purchase.payment_status} /></TableCell><TableCell><StatusBadge status={purchase.purchase_status} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No purchases found.</TableCell></TableRow>}</TableBody>
    </Table>
    <DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={go} />
  </div>;
}
