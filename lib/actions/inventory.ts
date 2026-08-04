"use server";

import { revalidatePath } from "next/cache";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validations";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Product, StockMovement } from "@/types/application";
import {
  caught,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

export async function adjustStock(
  input: StockAdjustmentInput
): Promise<ActionResult<{ movementId: string }>> {
  const auth = await getActionContext("canManageInventory");
  if (!auth.success) return auth;
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  const { data: product } = await auth.data.supabase
    .from("products")
    .select("id")
    .eq("id", parsed.data.product_id)
    .eq("shop_id", auth.data.shopId)
    .maybeSingle();
  if (!product) return fail("Product not found");

  try {
    const { data, error } = await auth.data.supabase.rpc("adjust_stock", {
      p_product_id: parsed.data.product_id,
      p_quantity_change: parsed.data.quantity_change,
      p_movement_type: parsed.data.movement_type,
      p_note: parsed.data.note?.trim().slice(0, 500) || null,
    });
    if (error) throw error;
    if (!data) throw new Error("Stock was not adjusted");
    revalidatePath("/inventory");
    revalidatePath("/stock-movements");
    revalidatePath("/products");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return ok({ movementId: data });
  } catch (error) {
    return caught(error, "Could not adjust stock");
  }
}

export async function getStockMovements(
  filters: {
    productId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<
  ActionResult<{ movements: StockMovement[]; count: number; page: number; pageSize: number }>
> {
  const auth = await getActionContext("canManageInventory");
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  let query = auth.data.supabase
    .from("stock_movements")
    .select("*, products(*)", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filters.productId) {
    const productId = idSchema.safeParse(filters.productId);
    if (!productId.success) return validationFailure(productId);
    query = query.eq("product_id", productId.data);
  }
  if (filters.movementType) query = query.eq("movement_type", filters.movementType);
  if (filters.startDate) {
    const date = new Date(filters.startDate);
    if (Number.isNaN(date.getTime())) return fail("Invalid start date");
    query = query.gte("created_at", date.toISOString());
  }
  if (filters.endDate) {
    const date = new Date(filters.endDate);
    if (Number.isNaN(date.getTime())) return fail("Invalid end date");
    query = query.lt("created_at", date.toISOString());
  }
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load stock movements");
  return ok({
    movements: (data ?? []) as unknown as StockMovement[],
    count: count ?? 0,
    page,
    pageSize,
  });
}

export async function getInventory(
  filters: {
    search?: string;
    categoryId?: string;
    stock?: "all" | "low" | "out";
    page?: number;
    pageSize?: number;
  } = {}
): Promise<ActionResult<{ products: Product[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext("canManageInventory");
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  let query = auth.data.supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .eq("track_inventory", true)
    .order("name");
  const search = filters.search?.trim().slice(0, 100);
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
  if (filters.categoryId) {
    const categoryId = idSchema.safeParse(filters.categoryId);
    if (!categoryId.success) return validationFailure(categoryId);
    query = query.eq("category_id", categoryId.data);
  }

  if (!filters.stock || filters.stock === "all") {
    const { data, error, count } = await query.range(from, to);
    if (error) return caught(error, "Could not load inventory");
    return ok({ products: (data ?? []) as Product[], count: count ?? 0, page, pageSize });
  }

  if (filters.stock === "out") query = query.lte("stock_quantity", 0);
  const { data, error } = await query;
  if (error) return caught(error, "Could not load inventory");
  const matching = ((data ?? []) as Product[]).filter((product) =>
    filters.stock === "out"
      ? product.stock_quantity <= 0
      : product.stock_quantity > 0 && product.stock_quantity <= product.minimum_stock
  );
  return ok({
    products: matching.slice(from, to + 1),
    count: matching.length,
    page,
    pageSize,
  });
}
