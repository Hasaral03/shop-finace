import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRouteAccess } from "@/lib/auth";
import { getSupplierById } from "@/lib/actions/suppliers";
import { getPurchases } from "@/lib/actions/purchases";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SupplierPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const [{ profile, shop }, { supplierId }] = await Promise.all([requireRouteAccess("/suppliers"), params]); const [supplierResult, purchasesResult] = await Promise.all([getSupplierById(supplierId), getPurchases({ supplierId, pageSize: 50 })]); if (!supplierResult.success) notFound(); const supplier = supplierResult.data; const purchases = purchasesResult.success ? purchasesResult.data.purchases : []; const currency = shop?.currency ?? "LKR";
  return <div className="space-y-6"><PageHeader title={supplier.name} description={[supplier.contact_person, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "No contact information"} />
    <div className="grid gap-4 sm:grid-cols-2"><Card><CardHeader><CardTitle className="text-muted-foreground">Outstanding balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatCurrency(supplier.current_balance, currency)}</CardContent></Card><Card><CardHeader><CardTitle className="text-muted-foreground">Purchases recorded</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{purchases.length}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Purchase history</CardTitle></CardHeader><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead>Purchase</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader><TableBody>{purchases.length ? purchases.map((purchase) => <TableRow key={purchase.id}><TableCell>{profile.role === "owner" || profile.role === "manager" ? <Link href={`/purchases/${purchase.id}`} className="font-medium text-primary hover:underline">{purchase.purchase_number}</Link> : <span className="font-medium">{purchase.purchase_number}</span>}</TableCell><TableCell>{formatDateTime(purchase.purchased_at, shop?.timezone)}</TableCell><TableCell>{formatCurrency(purchase.total_amount, currency)}</TableCell><TableCell>{formatCurrency(purchase.balance_amount, currency)}</TableCell><TableCell><StatusBadge status={purchase.payment_status} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No purchases yet.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    {(supplier.address || supplier.notes) && <Card><CardHeader><CardTitle>Supplier notes</CardTitle></CardHeader><CardContent className="space-y-2 text-muted-foreground">{supplier.address && <p>{supplier.address}</p>}{supplier.notes && <p>{supplier.notes}</p>}</CardContent></Card>}
  </div>;
}
