"use server";

import { revalidatePath } from "next/cache";
import { createPurchaseSchema, type CreatePurchaseInput } from "@/lib/validations";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Json } from "@/types/database";
import type { Purchase } from "@/types/application";
import {
  caught,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

type PurchaseFilters = {
  search?: string;
  supplierId?: string;
  status?: "completed" | "pending" | "cancelled";
  paymentStatus?: "paid" | "partially_paid" | "unpaid";
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

function validDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createPurchase(
  input: CreatePurchaseInput
): Promise<ActionResult<{ purchaseId: string }>> {
  const auth = await getActionContext("canManagePurchases");
  if (!auth.success) return auth;
  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  if (parsed.data.supplier_id) {
    const { data: supplier } = await auth.data.supabase
      .from("suppliers")
      .select("id")
      .eq("id", parsed.data.supplier_id)
      .eq("shop_id", auth.data.shopId)
      .eq("is_active", true)
      .maybeSingle();
    if (!supplier) return fail("Supplier not found or inactive");
  }

  try {
    const items: Json = parsed.data.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    }));
    const { data, error } = await auth.data.supabase.rpc("create_purchase_transaction", {
      p_supplier_id: parsed.data.supplier_id,
      p_items: items,
      p_discount_amount: parsed.data.discount_amount,
      p_tax_amount: parsed.data.tax_amount,
      p_amount_paid: parsed.data.amount_paid,
      p_supplier_invoice_number: parsed.data.supplier_invoice_number ?? null,
      p_notes: parsed.data.notes ?? null,
      p_update_cost: parsed.data.update_cost,
    });
    if (error) throw error;
    if (!data) throw new Error("Purchase was not created");
    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");
    return ok({ purchaseId: data });
  } catch (error) {
    return caught(error, "Could not create purchase");
  }
}

export async function getPurchases(
  filters: PurchaseFilters = {}
): Promise<ActionResult<{ purchases: Purchase[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canManagePurchases", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  let query = auth.data.supabase
    .from("purchases")
    .select("*, suppliers(*)", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("purchased_at", { ascending: false })
    .range(from, to);
  const search = filters.search?.trim().slice(0, 100);
  if (search) {
    query = query.or(
      `purchase_number.ilike.%${search}%,supplier_invoice_number.ilike.%${search}%`
    );
  }
  if (filters.supplierId) {
    const supplierId = idSchema.safeParse(filters.supplierId);
    if (!supplierId.success) return validationFailure(supplierId);
    query = query.eq("supplier_id", supplierId.data);
  }
  if (filters.status) query = query.eq("purchase_status", filters.status);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.startDate) {
    const start = validDate(filters.startDate);
    if (!start) return fail("Invalid start date");
    query = query.gte("purchased_at", start);
  }
  if (filters.endDate) {
    const end = validDate(filters.endDate);
    if (!end) return fail("Invalid end date");
    query = query.lt("purchased_at", end);
  }
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load purchases");
  return ok({
    purchases: (data ?? []) as unknown as Purchase[],
    count: count ?? 0,
    page,
    pageSize,
  });
}

export async function getPurchaseById(
  purchaseId: string
): Promise<ActionResult<Purchase>> {
  const auth = await getActionContext(["canManagePurchases", "canViewReports"]);
  if (!auth.success) return auth;
  const id = idSchema.safeParse(purchaseId);
  if (!id.success) return validationFailure(id);
  const { data, error } = await auth.data.supabase
    .from("purchases")
    .select("*, suppliers(*), purchase_items(*, products(*))")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .single();
  if (error) return caught(error, "Purchase not found");
  return ok(data as unknown as Purchase);
}
