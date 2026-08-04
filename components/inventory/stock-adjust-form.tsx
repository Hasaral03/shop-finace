"use client";

import { useEffect, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { adjustStock } from "@/lib/actions/inventory";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validations";
import type { Product } from "@/types/application";
import { Button } from "@/components/ui/button";
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

interface StockAdjustFormProps {
  product: Product;
  trigger: ReactElement;
}

export function StockAdjustForm({ product, trigger }: StockAdjustFormProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      product_id: product.id,
      quantity_change: 0,
      movement_type: "adjustment",
      note: "",
    },
  });
  const movementType = useWatch({ control: form.control, name: "movement_type" });

  useEffect(() => {
    if (open) {
      form.reset({ product_id: product.id, quantity_change: 0, movement_type: "adjustment", note: "" });
    }
  }, [form, open, product.id]);

  async function onSubmit(values: StockAdjustmentInput) {
    const result = await adjustStock(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Stock adjusted");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {product.name}</DialogTitle>
          <DialogDescription>
            Current stock: {product.stock_quantity} {product.unit}. Use a negative quantity to remove stock.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor={`quantity-${product.id}`}>Quantity change</Label>
            <Input id={`quantity-${product.id}`} type="number" step="0.001" autoFocus aria-invalid={Boolean(form.formState.errors.quantity_change)} {...form.register("quantity_change")} />
            {form.formState.errors.quantity_change ? <p className="text-xs text-destructive">{form.formState.errors.quantity_change.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={movementType} onValueChange={(value) => form.setValue("movement_type", value as StockAdjustmentInput["movement_type"], { shouldDirty: true })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Stock correction</SelectItem>
                <SelectItem value="opening_stock">Opening stock</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="transfer_in">Transfer in</SelectItem>
                <SelectItem value="transfer_out">Transfer out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`note-${product.id}`}>Note</Label>
            <Textarea id={`note-${product.id}`} rows={3} placeholder="Why is this adjustment needed?" {...form.register("note")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Adjusting…" : "Adjust stock"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
