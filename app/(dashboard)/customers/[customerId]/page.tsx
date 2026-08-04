import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRouteAccess } from "@/lib/auth";
import { getCustomerById } from "@/lib/actions/customers";
import { getSales } from "@/lib/actions/sales";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const [{ shop }, { customerId }] = await Promise.all([requireRouteAccess("/customers"), params]);
  const [customerResult, salesResult] = await Promise.all([getCustomerById(customerId), getSales({ customerId, pageSize: 50 })]); if (!customerResult.success) notFound(); const customer = customerResult.data; const sales = salesResult.success ? salesResult.data.sales : []; const currency = shop?.currency ?? "LKR";
  return <div className="space-y-6"><PageHeader title={customer.name} description={[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact information"} />
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-muted-foreground">Outstanding balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatCurrency(customer.current_balance, currency)}</CardContent></Card><Card><CardHeader><CardTitle className="text-muted-foreground">Credit limit</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatCurrency(customer.credit_limit, currency)}</CardContent></Card><Card><CardHeader><CardTitle className="text-muted-foreground">Available credit</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatCurrency(Math.max(0, customer.credit_limit - customer.current_balance), currency)}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Sales history</CardTitle></CardHeader><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader><TableBody>{sales.length ? sales.map((sale) => <TableRow key={sale.id}><TableCell><Link href={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">{sale.invoice_number}</Link></TableCell><TableCell>{formatDateTime(sale.sold_at, shop?.timezone)}</TableCell><TableCell>{formatCurrency(sale.total_amount, currency)}</TableCell><TableCell>{formatCurrency(sale.balance_amount, currency)}</TableCell><TableCell><StatusBadge status={sale.payment_status} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No sales yet.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    {(customer.address || customer.notes) && <Card><CardHeader><CardTitle>Customer notes</CardTitle></CardHeader><CardContent className="space-y-2 text-muted-foreground">{customer.address && <p>{customer.address}</p>}{customer.notes && <p>{customer.notes}</p>}</CardContent></Card>}
  </div>;
}
