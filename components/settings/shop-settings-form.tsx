"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateShopSettings } from "@/lib/actions/settings";
import { shopSettingsSchema, type ShopSettingsInput } from "@/lib/validations";
import type { Shop } from "@/types/application";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SettingsValues = z.input<typeof shopSettingsSchema>;

export function ShopSettingsForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const form = useForm<SettingsValues, unknown, ShopSettingsInput>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      name: shop.name,
      business_registration_number: shop.business_registration_number ?? "",
      phone: shop.phone ?? "",
      email: shop.email ?? "",
      address: shop.address ?? "",
      currency: shop.currency,
      timezone: shop.timezone,
      tax_rate: shop.tax_rate,
      receipt_footer: shop.receipt_footer ?? "",
      allow_negative_stock: shop.allow_negative_stock,
    },
  });
  const allowNegativeStock =
    useWatch({ control: form.control, name: "allow_negative_stock" }) ?? false;

  async function submit(values: ShopSettingsInput) {
    const result = await updateShopSettings(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Shop settings saved");
    form.reset({ ...values });
    router.refresh();
  }

  const error = (field: keyof ShopSettingsInput) => form.formState.errors[field]?.message;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Shown throughout the dashboard and on receipts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" error={error("name")}>
            <Input autoFocus {...form.register("name")} aria-invalid={Boolean(error("name"))} />
          </Field>
          <Field label="Registration number" error={error("business_registration_number")}>
            <Input {...form.register("business_registration_number")} />
          </Field>
          <Field label="Phone" error={error("phone")}>
            <Input type="tel" {...form.register("phone")} />
          </Field>
          <Field label="Email" error={error("email")}>
            <Input type="email" {...form.register("email")} aria-invalid={Boolean(error("email"))} />
          </Field>
          <Field label="Address" error={error("address")} className="sm:col-span-2">
            <Textarea rows={3} {...form.register("address")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Finance and inventory</CardTitle>
          <CardDescription>Defaults used for pricing, tax, dates, and stock validation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency code" error={error("currency")}>
            <Input maxLength={3} placeholder="LKR" className="uppercase" {...form.register("currency")} />
          </Field>
          <Field label="Timezone" error={error("timezone")}>
            <Input placeholder="Asia/Colombo" {...form.register("timezone")} />
          </Field>
          <Field label="Tax rate (%)" error={error("tax_rate")}>
            <Input type="number" min="0" max="100" step="0.01" {...form.register("tax_rate")} />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="negative-stock">Allow negative stock</Label>
              <p className="text-xs text-muted-foreground">Permit sales when tracked stock is insufficient.</p>
            </div>
            <Switch
              id="negative-stock"
              checked={allowNegativeStock}
              onCheckedChange={(checked) => form.setValue("allow_negative_stock", checked, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Receipt</CardTitle></CardHeader>
        <CardContent>
          <Field label="Receipt footer" error={error("receipt_footer")}>
            <Textarea rows={4} placeholder="Thank you for your business!" {...form.register("receipt_footer")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
          Save settings
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
