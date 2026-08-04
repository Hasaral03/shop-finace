"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Barcode,
  CreditCard,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { createCustomer } from "@/lib/actions/customers";
import { createSale } from "@/lib/actions/sales";
import { calcSaleTotals, roundMoney, sumPayments } from "@/lib/calculations";
import { formatCurrency } from "@/lib/formatting";
import type { Category, Customer, PaymentMethod } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type PosProduct = {
  id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  selling_price: number;
  stock_quantity: number;
  unit: string;
  image_url: string | null;
  track_inventory: boolean;
};

type CartItem = PosProduct & {
  quantity: number;
  discount: number;
};

type PaymentRow = {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
};

type PosTerminalProps = {
  products: PosProduct[];
  categories: Category[];
  customers: Customer[];
  shop: {
    currency: string;
    taxRate: number;
    allowNegativeStock: boolean;
  };
  loadError: string | null;
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "online_payment", label: "Online payment" },
  { value: "credit", label: "Credit" },
  { value: "other", label: "Other" },
];

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function PosTerminal({
  products,
  categories,
  customers: initialCustomers,
  shop,
  loadError,
}: PosTerminalProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: crypto.randomUUID(), method: "cash", amount: 0, reference: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [splitPayment, setSplitPayment] = useState(false);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [pending, startTransition] = useTransition();
  const [addingCustomer, startCustomerTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category_id === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  const totals = useMemo(() => {
    try {
      return calcSaleTotals({
        items: cart.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.selling_price,
          discountAmount: item.discount,
        })),
        overallDiscount,
        taxRate: shop.taxRate,
      });
    } catch {
      return calcSaleTotals({
        items: cart.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.selling_price,
          discountAmount: item.discount,
        })),
        overallDiscount: 0,
        taxRate: shop.taxRate,
      });
    }
  }, [cart, overallDiscount, shop.taxRate]);

  const normalizedPayments = useMemo(() => {
    if (splitPayment) return payments;
    const row = payments[0];
    if (!row) return [];
    const amount = row.method === "cash" ? row.amount || totals.total : totals.total;
    return [{ ...row, amount }];
  }, [payments, splitPayment, totals.total]);
  const totalTendered = sumPayments(normalizedPayments);
  const cashChange = roundMoney(Math.max(totalTendered - totals.total, 0));
  const money = (amount: number) => formatCurrency(amount, shop.currency);

  function addProduct(product: PosProduct) {
    if (
      product.track_inventory &&
      !shop.allowNegativeStock &&
      product.stock_quantity <= 0
    ) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        const nextQuantity = existing.quantity + 1;
        if (
          product.track_inventory &&
          !shop.allowNegativeStock &&
          nextQuantity > product.stock_quantity
        ) {
          toast.error(`Only ${product.stock_quantity} ${product.unit} available`);
          return current;
        }
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQuantity } : item
        );
      }
      return [...current, { ...product, quantity: 1, discount: 0 }];
    });
    setSearch("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function updateQuantity(id: string, quantity: number) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    if (quantity <= 0) {
      setCart((current) => current.filter((entry) => entry.id !== id));
      return;
    }
    if (
      item.track_inventory &&
      !shop.allowNegativeStock &&
      quantity > item.stock_quantity
    ) {
      toast.error(`Only ${item.stock_quantity} ${item.unit} available`);
      return;
    }
    setCart((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              quantity,
              discount: Math.min(entry.discount, quantity * entry.selling_price),
            }
          : entry
      )
    );
  }

  function setLineDiscount(id: string, discount: number) {
    setCart((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              discount: Math.min(discount, item.quantity * item.selling_price),
            }
          : item
      )
    );
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const query = search.trim().toLowerCase();
    const exact = products.find(
      (product) =>
        product.barcode?.toLowerCase() === query ||
        product.sku?.toLowerCase() === query
    );
    const product = exact ?? (filteredProducts.length === 1 ? filteredProducts[0] : null);
    if (product) addProduct(product);
    else toast.error("No exact product match");
  }

  function updatePayment(id: string, patch: Partial<PaymentRow>) {
    setPayments((current) =>
      current.map((payment) => (payment.id === id ? { ...payment, ...patch } : payment))
    );
  }

  function toggleSplit() {
    setSplitPayment((current) => {
      if (current) {
        setPayments((rows) => [rows[0] ?? { id: crypto.randomUUID(), method: "cash", amount: totals.total, reference: "" }]);
      } else {
        setPayments((rows) =>
          rows.map((row, index) => ({
            ...row,
            amount: index === 0 && row.amount === 0 ? totals.total : row.amount,
          }))
        );
      }
      return !current;
    });
  }

  function completeSale() {
    if (!cart.length) {
      toast.error("Add at least one product");
      searchRef.current?.focus();
      return;
    }
    if (overallDiscount > totals.subtotal) {
      toast.error("Discount cannot exceed subtotal");
      return;
    }
    const stockProblem = cart.find(
      (item) =>
        item.track_inventory &&
        !shop.allowNegativeStock &&
        item.quantity > item.stock_quantity
    );
    if (stockProblem) {
      toast.error(`Insufficient stock for ${stockProblem.name}`);
      return;
    }
    if (!normalizedPayments.length || normalizedPayments.some((payment) => payment.amount <= 0)) {
      toast.error("Enter valid payment amounts");
      return;
    }
    if (normalizedPayments.some((payment) => payment.method === "credit") && !customerId) {
      toast.error("Select a customer for a credit sale");
      return;
    }
    const nonCash = normalizedPayments
      .filter((payment) => payment.method !== "cash")
      .reduce((sum, payment) => sum + payment.amount, 0);
    if (nonCash > totals.total) {
      toast.error("Non-cash payments cannot exceed the total");
      return;
    }
    if (totalTendered < totals.total) {
      toast.error(`Payment is short by ${money(totals.total - totalTendered)}`);
      return;
    }

    startTransition(async () => {
      const result = await createSale({
        customer_id: customerId,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          discount_amount: item.discount,
        })),
        payments: normalizedPayments.map((payment) => ({
          payment_method: payment.method,
          amount: payment.amount,
          reference_number: payment.reference.trim() || undefined,
        })),
        discount_amount: overallDiscount,
        tax_amount: totals.taxAmount,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Sale completed successfully");
      window.open(`/receipts/${result.data.saleId}`, "_blank", "noopener,noreferrer");
      setCart([]);
      setCustomerId(null);
      setOverallDiscount(0);
      setNotes("");
      setSplitPayment(false);
      setPayments([{ id: crypto.randomUUID(), method: "cash", amount: 0, reference: "" }]);
      searchRef.current?.focus();
    });
  }

  function addCustomer() {
    if (!customerForm.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    startCustomerTransition(async () => {
      const result = await createCustomer({
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        credit_limit: 0,
        notes: "",
        is_active: true,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCustomers((current) => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(result.data.id);
      setCustomerDialog(false);
      setCustomerForm({ name: "", phone: "", email: "", address: "" });
      toast.success("Customer added");
    });
  }

  return (
    <div className="-m-4 grid min-h-full gap-0 md:-m-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 space-y-4 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Point of sale</h1>
          <p className="text-sm text-muted-foreground">
            Search, scan, and add products to the current sale.
          </p>
        </div>
        {loadError ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {loadError}
          </div>
        ) : null}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name, SKU, or scan barcode…"
            className="h-11 pr-10 pl-9"
            aria-label="Product search or barcode"
          />
          <Barcode className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={category === "all" ? "default" : "outline"}
            onClick={() => setCategory("all")}
          >
            All
          </Button>
          {categories.map((item) => (
            <Button
              key={item.id}
              variant={category === item.id ? "default" : "outline"}
              onClick={() => setCategory(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
        {filteredProducts.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const unavailable =
                product.track_inventory &&
                !shop.allowNegativeStock &&
                product.stock_quantity <= 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => addProduct(product)}
                  className="group overflow-hidden rounded-xl border bg-card text-left transition hover:border-foreground/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, 220px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <PackageSearch className="absolute top-1/2 left-1/2 size-9 -translate-1/2 text-muted-foreground/60" />
                    )}
                    {unavailable ? (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        Out of stock
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 min-h-10 font-medium">{product.name}</p>
                    <div className="flex items-end justify-between gap-2">
                      <span className="font-semibold tabular-nums">{money(product.selling_price)}</span>
                      {product.track_inventory ? (
                        <span className="text-xs text-muted-foreground">{product.stock_quantity} {product.unit}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
            <PackageSearch className="mb-3 size-10 text-muted-foreground" />
            <p className="font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">Try another search or category.</p>
          </div>
        )}
      </section>

      <aside className="flex min-h-[70vh] flex-col border-t bg-card xl:sticky xl:top-0 xl:h-[calc(100svh-4rem)] xl:border-t-0 xl:border-l">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-5" />
            Current sale
            <Badge variant="secondary">{cart.length}</Badge>
          </h2>
          {cart.length ? (
            <Button variant="ghost" size="sm" onClick={() => setCart([])}>
              Clear
            </Button>
          ) : null}
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto">
          {!cart.length ? (
            <div className="flex h-full min-h-52 flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <ShoppingCart className="mb-3 size-10 opacity-50" />
              <p className="font-medium text-foreground">Cart is empty</p>
              <p className="text-sm">Select a product or scan a barcode.</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{money(item.selling_price)} / {item.unit}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon-sm" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus />
                      </Button>
                      <Input
                        type="number"
                        min="0.001"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item.id, numeric(event.target.value))}
                        className="w-16 text-center"
                        aria-label={`${item.name} quantity`}
                      />
                      <Button variant="outline" size="icon-sm" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus />
                      </Button>
                    </div>
                    <p className="font-semibold tabular-nums">
                      {money(item.quantity * item.selling_price - item.discount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`discount-${item.id}`} className="text-xs text-muted-foreground">Line discount</Label>
                    <Input
                      id={`discount-${item.id}`}
                      type="number"
                      min="0"
                      max={item.quantity * item.selling_price}
                      step="0.01"
                      value={item.discount || ""}
                      placeholder="0.00"
                      onChange={(event) => setLineDiscount(item.id, numeric(event.target.value))}
                      className="ml-auto w-28 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t p-4">
          <div className="flex gap-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9 min-w-0 flex-1" aria-label="Customer">
                <SelectValue placeholder="Walk-in customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customerId ? (
              <Button variant="outline" size="sm" onClick={() => setCustomerId(null)}>
                Clear
              </Button>
            ) : null}
            <Dialog open={customerDialog} onOpenChange={setCustomerDialog}>
              <DialogTrigger
                render={<Button variant="outline" size="icon-lg" aria-label="Quick add customer" />}
              >
                <UserPlus />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add customer</DialogTitle>
                  <DialogDescription>Create and select a customer without leaving the sale.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="customer-name">Name</Label>
                    <Input id="customer-name" autoFocus value={customerForm.name} onChange={(event) => setCustomerForm((form) => ({ ...form, name: event.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="customer-phone">Phone</Label>
                    <Input id="customer-phone" value={customerForm.phone} onChange={(event) => setCustomerForm((form) => ({ ...form, phone: event.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="customer-email">Email</Label>
                    <Input id="customer-email" type="email" value={customerForm.email} onChange={(event) => setCustomerForm((form) => ({ ...form, email: event.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="customer-address">Address</Label>
                    <Input id="customer-address" value={customerForm.address} onChange={(event) => setCustomerForm((form) => ({ ...form, address: event.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addCustomer} disabled={addingCustomer}>
                    {addingCustomer ? "Adding…" : "Add customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="overall-discount" className="font-normal text-muted-foreground">Overall discount</Label>
              <Input
                id="overall-discount"
                type="number"
                min="0"
                max={totals.subtotal}
                step="0.01"
                value={overallDiscount || ""}
                placeholder="0.00"
                onChange={(event) => setOverallDiscount(numeric(event.target.value))}
                className="w-28 text-right"
              />
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({shop.taxRate}%)</span><span className="tabular-nums">{money(totals.taxAmount)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{money(totals.total)}</span></div>
          </div>

          <Card size="sm">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payment</CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleSplit}>
                {splitPayment ? "Single payment" : "Split payment"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.map((payment, index) => (
                <div key={payment.id} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                  <Select
                    value={payment.method}
                    onValueChange={(method) => updatePayment(payment.id, { method: method as PaymentMethod })}
                  >
                    <SelectTrigger className="w-full" aria-label={`Payment method ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment.amount || ""}
                    placeholder={String(totals.total)}
                    disabled={!splitPayment && payment.method !== "cash"}
                    onChange={(event) => updatePayment(payment.id, { amount: numeric(event.target.value) })}
                    aria-label={payment.method === "cash" ? "Cash received" : "Payment amount"}
                    className="text-right"
                  />
                  {splitPayment && payments.length > 1 ? (
                    <Button variant="ghost" size="icon" aria-label="Remove payment" onClick={() => setPayments((current) => current.filter((row) => row.id !== payment.id))}>
                      <Trash2 />
                    </Button>
                  ) : <span />}
                  {payment.method !== "cash" && payment.method !== "credit" ? (
                    <Input
                      value={payment.reference}
                      onChange={(event) => updatePayment(payment.id, { reference: event.target.value })}
                      placeholder="Reference (optional)"
                      className="col-span-2"
                      aria-label="Payment reference"
                    />
                  ) : null}
                </div>
              ))}
              {splitPayment ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setPayments((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        method: "card",
                        amount: roundMoney(Math.max(totals.total - sumPayments(current), 0)),
                        reference: "",
                      },
                    ])
                  }
                >
                  <Plus /> Add payment
                </Button>
              ) : null}
              {normalizedPayments.some((payment) => payment.method === "cash") ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-medium tabular-nums">{money(cashChange)}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Sale notes (optional)"
            rows={2}
            aria-label="Sale notes"
          />
          <Button
            size="lg"
            className="h-12 w-full text-base"
            disabled={pending || !cart.length}
            onClick={completeSale}
          >
            <CreditCard />
            {pending ? "Completing sale…" : `Charge ${money(totals.total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Press Enter after scanning a barcode to add it.
          </p>
        </div>
      </aside>
    </div>
  );
}
