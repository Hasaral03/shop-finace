"use server";

import { revalidatePath } from "next/cache";
import { createSaleSchema, type CreateSaleInput } from "@/lib/validations";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Json } from "@/types/database";
import type { Sale, SaleItem } from "@/types/application";
import {
  caught,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

type SaleFilters = {
  search?: string;
  status?: "completed" | "pending" | "cancelled" | "refunded";
  paymentStatus?: "paid" | "partially_paid" | "unpaid" | "refunded";
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};
type VisibleSaleItem = Omit<SaleItem, "unit_cost"> & { unit_cost: number | null };
type SaleDetails = Omit<Sale, "sale_items"> & { sale_items?: VisibleSaleItem[] };

function validDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createSale(input: CreateSaleInput): Promise<ActionResult<{ saleId: string }>> {
  const auth = await getActionContext("canCreateSales");
  if (!auth.success) return auth;
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  if (parsed.data.customer_id) {
    const { data: customer } = await auth.data.supabase
      .from("customers")
      .select("id")
      .eq("id", parsed.data.customer_id)
      .eq("shop_id", auth.data.shopId)
      .eq("is_active", true)
      .maybeSingle();
    if (!customer) return fail("Customer not found or inactive");
  }

  try {
    const items: Json = parsed.data.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
    }));
    const payments: Json = parsed.data.payments.map((payment) => ({
      payment_method: payment.payment_method,
      amount: payment.amount,
      reference_number: payment.reference_number ?? null,
    }));
    const { data, error } = await auth.data.supabase.rpc("create_sale_transaction", {
      p_customer_id: parsed.data.customer_id,
      p_items: items,
      p_payments: payments,
      p_discount_amount: parsed.data.discount_amount,
      p_tax_amount: parsed.data.tax_amount,
      p_notes: parsed.data.notes ?? null,
    });
    if (error) throw error;
    if (!data) throw new Error("Sale was not created");
    revalidatePath("/pos");
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    return ok({ saleId: data });
  } catch (error) {
    return caught(error, "Could not complete sale");
  }
}

export async function cancelSale(
  saleId: string,
  reason?: string
): Promise<ActionResult<{ cancelled: true }>> {
  const auth = await getActionContext("canCancelSales");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(saleId);
  if (!id.success) return validationFailure(id);
  const { data: sale } = await auth.data.supabase
    .from("sales")
    .select("id")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .maybeSingle();
  if (!sale) return fail("Sale not found");

  try {
    const { data, error } = await auth.data.supabase.rpc("cancel_sale", {
      p_sale_id: id.data,
      p_reason: reason?.trim().slice(0, 500) || null,
    });
    if (error) throw error;
    if (!data) throw new Error("Sale could not be cancelled");
    revalidatePath("/sales");
    revalidatePath(`/sales/${id.data}`);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    return ok({ cancelled: true });
  } catch (error) {
    return caught(error, "Could not cancel sale");
  }
}

export async function getSales(
  filters: SaleFilters = {}
): Promise<ActionResult<{ sales: Sale[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canCreateSales", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  const search = filters.search?.trim().slice(0, 100);
  let query = auth.data.supabase
    .from("sales")
    .select("*, customers(*), profiles(*)", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("sold_at", { ascending: false })
    .range(from, to);
  if (search) {
    const [{ data: customers }, { data: cashiers }] = await Promise.all([
      auth.data.supabase
        .from("customers")
        .select("id")
        .eq("shop_id", auth.data.shopId)
        .ilike("name", `%${search}%`)
        .limit(50),
      auth.data.supabase
        .from("profiles")
        .select("id")
        .eq("shop_id", auth.data.shopId)
        .ilike("full_name", `%${search}%`)
        .limit(50),
    ]);
    const clauses = [`invoice_number.ilike.%${search.replace(/[(),]/g, "")}%`];
    if (customers?.length) clauses.push(`customer_id.in.(${customers.map(({ id }) => id).join(",")})`);
    if (cashiers?.length) clauses.push(`sold_by.in.(${cashiers.map(({ id }) => id).join(",")})`);
    query = query.or(clauses.join(","));
  }
  if (filters.status) query = query.eq("sale_status", filters.status);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.customerId) {
    const customerId = idSchema.safeParse(filters.customerId);
    if (!customerId.success) return validationFailure(customerId);
    query = query.eq("customer_id", customerId.data);
  }
  if (filters.startDate) {
    const start = validDate(filters.startDate);
    if (!start) return fail("Invalid start date");
    query = query.gte("sold_at", start);
  }
  if (filters.endDate) {
    const end = validDate(filters.endDate);
    if (!end) return fail("Invalid end date");
    query = query.lt("sold_at", end);
  }
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load sales");
  return ok({ sales: (data ?? []) as unknown as Sale[], count: count ?? 0, page, pageSize });
}

export async function getSaleById(saleId: string): Promise<ActionResult<SaleDetails>> {
  const auth = await getActionContext(["canCreateSales", "canViewReports"]);
  if (!auth.success) return auth;
  const id = idSchema.safeParse(saleId);
  if (!id.success) return validationFailure(id);
  const { data, error } = await auth.data.supabase
    .from("sales")
    .select("*, customers(*), profiles(*), sale_items(*), payments(*)")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .single();
  if (error) return caught(error, "Sale not found");

  const sale = data as unknown as SaleDetails;
  if (auth.data.profile.role === "cashier" && sale.sale_items) {
    sale.sale_items = sale.sale_items.map((item) => ({ ...item, unit_cost: null }));
  }
  return ok(sale);
}
