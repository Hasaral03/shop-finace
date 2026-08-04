"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createProduct, updateProduct, uploadProductImage } from "@/lib/actions/products";
import { productSchema, type ProductInput } from "@/lib/validations";
import type { Category, Product } from "@/types/application";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ProductFormProps {
  categories: Category[];
  product?: Product;
}

type ProductFormValues = z.input<typeof productSchema>;

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const form = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description ?? "",
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          category_id: product.category_id,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          stock_quantity: product.stock_quantity,
          minimum_stock: product.minimum_stock,
          unit: product.unit,
          track_inventory: product.track_inventory,
          is_active: product.is_active,
        }
      : {
          name: "",
          description: "",
          sku: "",
          barcode: "",
          category_id: null,
          cost_price: 0,
          selling_price: 0,
          stock_quantity: 0,
          minimum_stock: 0,
          unit: "item",
          track_inventory: true,
          is_active: true,
        },
  });
  const tracking = useWatch({ control: form.control, name: "track_inventory" }) ?? true;
  const categoryId = useWatch({ control: form.control, name: "category_id" });
  const isActive = useWatch({ control: form.control, name: "is_active" }) ?? true;

  async function onSubmit(values: ProductInput) {
    const result = product
      ? await updateProduct(product.id, values)
      : await createProduct(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (image) {
      const uploaded = await uploadProductImage(result.data.id, image);
      if (!uploaded.success) {
        toast.warning(`Product saved, but image upload failed: ${uploaded.error}`);
      }
    }
    toast.success(product ? "Product updated" : "Product created");
    router.push("/products");
    router.refresh();
  }

  const error = (name: keyof ProductInput) => form.formState.errors[name]?.message;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Product details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoFocus aria-invalid={Boolean(error("name"))} {...form.register("name")} />
              {error("name") ? <p className="text-xs text-destructive">{error("name")}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register("sku")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" {...form.register("barcode")} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId ?? "none"}
                onValueChange={(value) => form.setValue("category_id", value === "none" ? null : value, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.filter((category) => category.is_active || category.id === product?.category_id).map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="item, kg, box…" aria-invalid={Boolean(error("unit"))} {...form.register("unit")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Product image</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30">
              {image || product?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="h-full w-full object-cover" alt="" src={image ? URL.createObjectURL(image) : product?.image_url ?? ""} />
              ) : (
                <ImageIcon className="size-10 text-muted-foreground" />
              )}
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Maximum 5 MB.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost price</Label>
              <Input id="cost_price" type="number" min="0" step="0.01" aria-invalid={Boolean(error("cost_price"))} {...form.register("cost_price")} />
              {error("cost_price") ? <p className="text-xs text-destructive">{error("cost_price")}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling price</Label>
              <Input id="selling_price" type="number" min="0" step="0.01" aria-invalid={Boolean(error("selling_price"))} {...form.register("selling_price")} />
              {error("selling_price") ? <p className="text-xs text-destructive">{error("selling_price")}</p> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label htmlFor="track_inventory">Track inventory</Label><p className="mt-1 text-xs text-muted-foreground">Monitor stock and warnings.</p></div>
              <Switch id="track_inventory" checked={tracking} onCheckedChange={(checked) => form.setValue("track_inventory", checked, { shouldDirty: true })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Current stock</Label>
                <Input id="stock_quantity" type="number" min="0" step="0.001" disabled={!tracking} {...form.register("stock_quantity")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimum_stock">Low-stock level</Label>
                <Input id="minimum_stock" type="number" min="0" step="0.001" disabled={!tracking} {...form.register("minimum_stock")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div><Label htmlFor="is_active">Active product</Label><p className="mt-1 text-xs text-muted-foreground">Inactive products are hidden from sales.</p></div>
        <Switch id="is_active" checked={isActive} onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <><Loader2 className="animate-spin" /> Saving…</> : "Save product"}
        </Button>
      </div>
    </form>
  );
}
