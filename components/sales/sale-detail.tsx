"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Printer } from "lucide-react";
import { toast } from "sonner";
import type { Payment, Sale, SaleItem } from "@/types/application";
import { cancelSale } from "@/lib/actions/sales";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DetailSale = Omit<Sale, "sale_items"> & {
  sale_items?: (Omit<SaleItem, "unit_cost"> & { unit_cost: number | null })[];
  payments?: Payment[];
};

export function SaleDetail({ sale, currency, timezone, canCancel, canViewCost }: {
  sale: DetailSale; currency: string; timezone: string; canCancel: boolean; canViewCost: boolean;
}) {
  const router = useRouter();
  async function cancel() {
    const result = await cancelSale(sale.id, "Cancelled from sale details");
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Sale cancelled and stock restored");
    router.refresh();
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{sale.invoice_number}</h1><StatusBadge status={sale.sale_status} /></div>
          <p className="text-sm text-muted-foreground">{formatDateTime(sale.sold_at, timezone)} · {sale.customers?.name ?? "Walk-in customer"}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/receipts/${sale.id}`} target="_blank" className={cn(buttonVariants({ variant: "outline" }))}><Printer /> Print receipt</Link>
          {canCancel && sale.sale_status !== "cancelled" ? <ConfirmDialog trigger={<Button variant="destructive"><Ban /> Cancel sale</Button>} title="Cancel this sale?" description="This reverses inventory and cannot be undone." confirmLabel="Cancel sale" onConfirm={cancel} /> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Subtotal", sale.subtotal], ["Discount", sale.discount_amount], ["Paid", sale.amount_paid], ["Balance", sale.balance_amount]].map(([label, value]) => (
          <Card key={String(label)} size="sm"><CardHeader><CardTitle className="text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(Number(value), currency)}</CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead>{canViewCost && <TableHead>Cost</TableHead>}<TableHead>Discount</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>{sale.sale_items?.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.product_name}</div><div className="text-xs text-muted-foreground">{item.product_sku ?? "No SKU"}</div></TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatCurrency(item.unit_price, currency)}</TableCell>{canViewCost && <TableCell>{formatCurrency(item.unit_cost, currency)}</TableCell>}<TableCell>{formatCurrency(item.discount_amount, currency)}</TableCell><TableCell className="text-right font-medium">{formatCurrency(item.line_total, currency)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent className="space-y-3">{sale.payments?.length ? sale.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0"><div><p className="font-medium capitalize">{payment.payment_method.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{payment.reference_number || formatDateTime(payment.paid_at, timezone)}</p></div><p className="font-medium">{formatCurrency(payment.amount, currency)}</p></div>) : <p className="text-muted-foreground">No payments recorded.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between"><span>Total</span><strong>{formatCurrency(sale.total_amount, currency)}</strong></div><div className="flex justify-between"><span>Payment status</span><StatusBadge status={sale.payment_status} /></div><div className="flex justify-between"><span>Cashier</span><span>{sale.profiles?.full_name ?? "—"}</span></div>{sale.notes && <p className="border-t pt-3 text-muted-foreground">{sale.notes}</p>}</CardContent></Card>
      </div>
    </div>
  );
}
