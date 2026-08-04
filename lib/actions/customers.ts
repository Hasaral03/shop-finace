"use server";

import { revalidatePath } from "next/cache";
import { customerSchema, type CustomerInput } from "@/lib/validations";
import { ok, type ActionResult } from "@/lib/auth";
import type { Customer } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

function values(input: CustomerInput) {
  return {
    ...input,
    phone: cleanOptional(input.phone),
    email: cleanOptional(input.email),
    address: cleanOptional(input.address),
    notes: cleanOptional(input.notes),
  };
}

export async function getCustomers(
  options: { search?: string; active?: boolean; page?: number; pageSize?: number } = {}
): Promise<ActionResult<{ customers: Customer[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canCreateSales", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(options.page, options.pageSize);
  let query = auth.data.supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("name")
    .range(from, to);
  const search = options.search?.trim().slice(0, 100);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  if (typeof options.active === "boolean") query = query.eq("is_active", options.active);
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load customers");
  return ok({ customers: (data ?? []) as Customer[], count: count ?? 0, page, pageSize });
}

export async function getCustomerById(customerId: string): Promise<ActionResult<Customer>> {
  const auth = await getActionContext(["canCreateSales", "canViewReports"]);
  if (!auth.success) return auth;
  const id = idSchema.safeParse(customerId);
  if (!id.success) return validationFailure(id);
  const { data, error } = await auth.data.supabase
    .from("customers")
    .select("*")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .single();
  if (error) return caught(error, "Customer not found");
  return ok(data as Customer);
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<Customer>> {
  const auth = await getActionContext("canCreateSales");
  if (!auth.success) return auth;
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("customers")
      .insert({ shop_id: auth.data.shopId, ...values(parsed.data) })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/customers");
    revalidatePath("/pos");
    return ok(data as Customer);
  } catch (error) {
    return caught(error, "Could not create customer");
  }
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
): Promise<ActionResult<Customer>> {
  const auth = await getActionContext("canCreateSales");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(customerId);
  const parsed = customerSchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("customers")
      .update(values(parsed.data))
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/customers");
    revalidatePath("/pos");
    return ok(data as Customer);
  } catch (error) {
    return caught(error, "Could not update customer");
  }
}

export async function deleteCustomer(customerId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(customerId);
  if (!id.success) return validationFailure(id);
  try {
    const { data, error } = await auth.data.supabase
      .from("customers")
      .delete()
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/customers");
    return ok({ id: data.id });
  } catch (error) {
    return caught(error, "Could not delete customer");
  }
}
