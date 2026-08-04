import { notFound } from "next/navigation";
import { requireRouteAccess } from "@/lib/auth";
import { getPurchaseById } from "@/lib/actions/purchases";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PurchasePage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const [{ shop }, { purchaseId }] = await Promise.all([requireRouteAccess("/purchases"), params]);
  const result = await getPurchaseById(purchaseId); if (!result.success) notFound(); const purchase = result.data;
  const currency = shop?.currency ?? "LKR"; const timezone = shop?.timezone ?? "Asia/Colombo";
  return <div className="space-y-6"><PageHeader title={purchase.purchase_number} description={`${formatDateTime(purchase.purchased_at, timezone)} · ${purchase.suppliers?.name ?? "No supplier"}`} actions={<><StatusBadge status={purchase.payment_status} /><StatusBadge status={purchase.purchase_status} /></>} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Subtotal", purchase.subtotal], ["Total", purchase.total_amount], ["Paid", purchase.amount_paid], ["Balance", purchase.balance_amount]].map(([label, amount]) => <Card key={String(label)} size="sm"><CardHeader><CardTitle className="text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(Number(amount), currency)}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Received items</CardTitle></CardHeader><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Unit cost</TableHead><TableHead className="text-right">Line total</TableHead></TableRow></TableHeader><TableBody>{purchase.purchase_items?.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.products?.name ?? "Unknown product"}</div><div className="text-xs text-muted-foreground">{item.products?.sku}</div></TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatCurrency(item.unit_cost, currency)}</TableCell><TableCell className="text-right font-medium">{formatCurrency(item.line_total, currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    {purchase.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent className="text-muted-foreground">{purchase.notes}</CardContent></Card>}
  </div>;
}
