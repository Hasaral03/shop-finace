"use client";

import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product, Supplier } from "@/types/application";
import { createPurchaseSchema, type CreatePurchaseInput } from "@/lib/validations";
import { createPurchase } from "@/lib/actions/purchases";
import { formatCurrency } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PurchaseForm({ suppliers, products, currency }: { suppliers: Supplier[]; products: Product[]; currency: string }) {
  const router = useRouter();
  const form = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema) as Resolver<CreatePurchaseInput>,
    defaultValues: { supplier_id: null, items: [{ product_id: "", quantity: 1, unit_cost: 0 }], discount_amount: 0, tax_amount: 0, amount_paid: 0, supplier_invoice_number: "", notes: "", update_cost: true },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" });
  const discount = useWatch({ control: form.control, name: "discount_amount" });
  const tax = useWatch({ control: form.control, name: "tax_amount" });
  const supplierId = useWatch({ control: form.control, name: "supplier_id" });
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));
  async function submit(values: CreatePurchaseInput) {
    const result = await createPurchase(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Purchase recorded and inventory updated");
    router.push(`/purchases/${result.data.purchaseId}`);
  }
  return <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 xl:grid-cols-[1fr_320px]">
    <Card><CardHeader><CardTitle>Purchase items</CardTitle></CardHeader><CardContent className="space-y-3">
      {fields.map((field, index) => <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_160px_auto] sm:items-end">
        <div className="space-y-1"><Label htmlFor={`product-${index}`}>Product</Label><select id={`product-${index}`} className="h-8 w-full rounded-lg border bg-background px-2 text-sm" {...form.register(`items.${index}.product_id`)}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ""}</option>)}</select></div>
        <div className="space-y-1"><Label>Quantity</Label><Input type="number" min="0.001" step="0.001" {...form.register(`items.${index}.quantity`)} /></div>
        <div className="space-y-1"><Label>Unit cost</Label><Input type="number" min="0" step="0.01" {...form.register(`items.${index}.unit_cost`)} /></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove item"><Trash2 /></Button>
      </div>)}
      {form.formState.errors.items && <p className="text-sm text-destructive">{form.formState.errors.items.message ?? "Check all purchase items"}</p>}
      <Button type="button" variant="outline" onClick={() => append({ product_id: "", quantity: 1, unit_cost: 0 })}><Plus /> Add item</Button>
    </CardContent></Card>
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Purchase details</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="space-y-1"><Label>Supplier</Label><select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={supplierId ?? ""} onChange={(event) => form.setValue("supplier_id", event.target.value || null)}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <div className="space-y-1"><Label>Supplier invoice</Label><Input {...form.register("supplier_invoice_number")} /></div>
        <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Discount</Label><Input type="number" min="0" step="0.01" {...form.register("discount_amount")} /></div><div className="space-y-1"><Label>Tax</Label><Input type="number" min="0" step="0.01" {...form.register("tax_amount")} /></div></div>
        <div className="space-y-1"><Label>Amount paid</Label><Input type="number" min="0" step="0.01" {...form.register("amount_paid")} /></div>
        <div className="space-y-1"><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("update_cost")} /> Update product costs</label>
      </CardContent></Card>
      <Card><CardContent className="space-y-2 pt-0"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div><div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>{formatCurrency(total, currency)}</span></div><Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Record purchase"}</Button></CardContent></Card>
    </div>
  </form>;
}
