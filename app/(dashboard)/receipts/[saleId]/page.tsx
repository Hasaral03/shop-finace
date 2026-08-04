import { notFound } from "next/navigation";

import { ReceiptView } from "@/components/pos/receipt-view";
import { getSaleById } from "@/lib/actions/sales";
import { requireRouteAccess } from "@/lib/auth";

type ReceiptPageProps = {
  params: Promise<{ saleId: string }>;
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { saleId } = await params;
  const [{ shop }, result] = await Promise.all([
    requireRouteAccess(`/receipts/${saleId}`),
    getSaleById(saleId),
  ]);

  if (!result.success || !shop) notFound();
  const sale = result.data;

  return (
    <ReceiptView
      shop={{
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        email: shop.email,
        registrationNumber: shop.business_registration_number,
        currency: shop.currency,
        timezone: shop.timezone,
        footer: shop.receipt_footer,
      }}
      sale={{
        invoiceNumber: sale.invoice_number,
        soldAt: sale.sold_at,
        cashier: sale.profiles?.full_name ?? "Staff",
        customer: sale.customers?.name ?? null,
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discount_amount),
        taxAmount: Number(sale.tax_amount),
        totalAmount: Number(sale.total_amount),
        amountPaid: Number(sale.amount_paid),
        balanceAmount: Number(sale.balance_amount),
        notes: sale.notes,
        items: (sale.sale_items ?? []).map((item) => ({
          id: item.id,
          name: item.product_name,
          sku: item.product_sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount),
          lineTotal: Number(item.line_total),
        })),
        payments: (sale.payments ?? []).map((payment) => ({
          id: payment.id,
          method: payment.payment_method,
          amount: Number(payment.amount),
          reference: payment.reference_number,
        })),
      }}
    />
  );
}
