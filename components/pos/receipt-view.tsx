"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import type { PaymentMethod } from "@/types/application";

export type ReceiptData = {
  invoiceNumber: string;
  soldAt: string;
  cashier: string;
  customer: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  notes: string | null;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    amount: number;
    reference: string | null;
  }>;
};

type ReceiptViewProps = {
  sale: ReceiptData;
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    registrationNumber: string | null;
    currency: string;
    timezone: string;
    footer: string | null;
  };
};

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  credit: "Credit",
  online_payment: "Online payment",
  other: "Other",
};

export function ReceiptView({ sale, shop }: ReceiptViewProps) {
  const money = (amount: number) => formatCurrency(amount, shop.currency);
  const totalTendered = sale.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const change = Math.max(totalTendered - sale.totalAmount, 0);

  return (
    <div className="receipt-page mx-auto max-w-md space-y-4">
      <div className="print-actions flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Receipt</h1>
          <p className="text-sm text-muted-foreground">{sale.invoiceNumber}</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer /> Print receipt
        </Button>
      </div>

      <article className="receipt bg-white p-6 font-mono text-xs text-black shadow-sm ring-1 ring-black/10">
        <header className="space-y-1 text-center">
          <h2 className="font-sans text-lg font-bold">{shop.name}</h2>
          {shop.address ? <p>{shop.address}</p> : null}
          {shop.phone ? <p>Tel: {shop.phone}</p> : null}
          {shop.email ? <p>{shop.email}</p> : null}
          {shop.registrationNumber ? <p>Reg: {shop.registrationNumber}</p> : null}
        </header>

        <div className="my-4 border-y border-dashed border-black py-3">
          <div className="flex justify-between gap-3"><span>Invoice</span><span>{sale.invoiceNumber}</span></div>
          <div className="flex justify-between gap-3"><span>Date</span><span>{formatDateTime(sale.soldAt, shop.timezone)}</span></div>
          <div className="flex justify-between gap-3"><span>Cashier</span><span>{sale.cashier}</span></div>
          {sale.customer ? <div className="flex justify-between gap-3"><span>Customer</span><span>{sale.customer}</span></div> : null}
        </div>

        <div>
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-black pb-1 font-bold">
            <span>ITEM</span>
            <span>AMOUNT</span>
          </div>
          {sale.items.map((item) => (
            <div key={item.id} className="border-b border-dashed border-black/40 py-2">
              <div className="flex justify-between gap-3">
                <span className="font-bold">{item.name}</span>
                <span>{money(item.lineTotal)}</span>
              </div>
              <div className="flex justify-between gap-3 text-black/70">
                <span>{item.quantity} × {money(item.unitPrice)}{item.sku ? ` · ${item.sku}` : ""}</span>
                {item.discountAmount > 0 ? <span>-{money(item.discountAmount)}</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-b border-dashed border-black py-3">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(sale.subtotal)}</span></div>
          {sale.discountAmount > 0 ? <div className="flex justify-between"><span>Discount</span><span>-{money(sale.discountAmount)}</span></div> : null}
          {sale.taxAmount > 0 ? <div className="flex justify-between"><span>Tax</span><span>{money(sale.taxAmount)}</span></div> : null}
          <div className="flex justify-between pt-1 text-sm font-bold"><span>TOTAL</span><span>{money(sale.totalAmount)}</span></div>
        </div>

        <div className="space-y-1 border-b border-dashed border-black py-3">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between gap-3">
              <span>{paymentLabels[payment.method]}{payment.reference ? ` (${payment.reference})` : ""}</span>
              <span>{money(payment.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold"><span>Paid</span><span>{money(sale.amountPaid)}</span></div>
          {sale.balanceAmount > 0 ? <div className="flex justify-between font-bold"><span>Balance due</span><span>{money(sale.balanceAmount)}</span></div> : null}
          {change > 0 ? <div className="flex justify-between font-bold"><span>Change</span><span>{money(change)}</span></div> : null}
        </div>

        {sale.notes ? <p className="mt-3 whitespace-pre-wrap">Note: {sale.notes}</p> : null}
        <footer className="mt-5 space-y-1 text-center">
          <p className="font-bold">Thank you!</p>
          {shop.footer ? <p className="whitespace-pre-wrap">{shop.footer}</p> : null}
        </footer>
      </article>

      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 4mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .receipt-page,
          .receipt-page * {
            visibility: visible;
          }
          .receipt-page {
            position: absolute;
            inset: 0;
            width: 72mm;
            max-width: 72mm;
            margin: 0;
          }
          .receipt {
            width: 72mm;
            padding: 0;
            box-shadow: none;
            outline: none;
          }
          .print-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
