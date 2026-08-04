"use server";

import { revalidatePath } from "next/cache";
import { supplierSchema, type SupplierInput } from "@/lib/validations";
import { ok, type ActionResult } from "@/lib/auth";
import type { Supplier } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

function values(input: SupplierInput) {
  return {
    ...input,
    contact_person: cleanOptional(input.contact_person),
    phone: cleanOptional(input.phone),
    email: cleanOptional(input.email),
    address: cleanOptional(input.address),
    notes: cleanOptional(input.notes),
  };
}

export async function getSuppliers(
  options: { search?: string; active?: boolean; page?: number; pageSize?: number } = {}
): Promise<ActionResult<{ suppliers: Supplier[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canManagePurchases", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(options.page, options.pageSize);
  let query = auth.data.supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("name")
    .range(from, to);
  const search = options.search?.trim().slice(0, 100);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (typeof options.active === "boolean") query = query.eq("is_active", options.active);
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load suppliers");
  return ok({ suppliers: (data ?? []) as Supplier[], count: count ?? 0, page, pageSize });
}

export async function getSupplierById(supplierId: string): Promise<ActionResult<Supplier>> {
  const auth = await getActionContext(["canManagePurchases", "canViewReports"]);
  if (!auth.success) return auth;
  const id = idSchema.safeParse(supplierId);
  if (!id.success) return validationFailure(id);
  const { data, error } = await auth.data.supabase
    .from("suppliers")
    .select("*")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .single();
  if (error) return caught(error, "Supplier not found");
  return ok(data as Supplier);
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult<Supplier>> {
  const auth = await getActionContext("canManagePurchases");
  if (!auth.success) return auth;
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("suppliers")
      .insert({ shop_id: auth.data.shopId, ...values(parsed.data) })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return ok(data as Supplier);
  } catch (error) {
    return caught(error, "Could not create supplier");
  }
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierInput
): Promise<ActionResult<Supplier>> {
  const auth = await getActionContext("canManagePurchases");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(supplierId);
  const parsed = supplierSchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("suppliers")
      .update(values(parsed.data))
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return ok(data as Supplier);
  } catch (error) {
    return caught(error, "Could not update supplier");
  }
}

export async function deleteSupplier(supplierId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext("canManagePurchases");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(supplierId);
  if (!id.success) return validationFailure(id);
  try {
    const { data, error } = await auth.data.supabase
      .from("suppliers")
      .delete()
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/suppliers");
    revalidatePath("/purchases");
    return ok({ id: data.id });
  } catch (error) {
    return caught(error, "Could not delete supplier");
  }
}
