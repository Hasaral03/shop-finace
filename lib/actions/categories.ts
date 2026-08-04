"use server";

import { revalidatePath } from "next/cache";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import { ok, type ActionResult } from "@/lib/auth";
import type { Category } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  idSchema,
  validationFailure,
} from "./_shared";

function values(input: CategoryInput) {
  return { ...input, description: cleanOptional(input.description) };
}

export async function getCategories(
  includeInactive = false
): Promise<ActionResult<Category[]>> {
  const auth = await getActionContext(["canManageProducts", "canCreateSales"]);
  if (!auth.success) return auth;
  let query = auth.data.supabase
    .from("categories")
    .select("*")
    .eq("shop_id", auth.data.shopId)
    .order("name");
  if (!includeInactive || !auth.data.profile.role.match(/owner|manager/)) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) return caught(error, "Could not load categories");
  return ok((data ?? []) as Category[]);
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<Category>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("categories")
      .insert({ shop_id: auth.data.shopId, ...values(parsed.data) })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/pos");
    return ok(data as Category);
  } catch (error) {
    return caught(error, "Could not create category");
  }
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput
): Promise<ActionResult<Category>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(categoryId);
  const parsed = categorySchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("categories")
      .update(values(parsed.data))
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/pos");
    return ok(data as Category);
  } catch (error) {
    return caught(error, "Could not update category");
  }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(categoryId);
  if (!id.success) return validationFailure(id);
  try {
    const { data, error } = await auth.data.supabase
      .from("categories")
      .delete()
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/pos");
    return ok({ id: data.id });
  } catch (error) {
    return caught(error, "Could not delete category");
  }
}
