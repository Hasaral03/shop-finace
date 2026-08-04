"use server";

import { revalidatePath } from "next/cache";
import {
  categorySchema,
  expenseSchema,
  type CategoryInput,
  type ExpenseInput,
} from "@/lib/validations";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Expense, ExpenseCategory } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

function expenseValues(input: ExpenseInput) {
  return {
    ...input,
    category_id: input.category_id ?? null,
    payment_method: input.payment_method ?? null,
    description: input.description.trim(),
  };
}

export async function getExpenses(
  filters: {
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<ActionResult<{ expenses: Expense[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canManageExpenses", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  let query = auth.data.supabase
    .from("expenses")
    .select("*, expense_categories(*)", { count: "exact" })
    .eq("shop_id", auth.data.shopId)
    .order("expense_date", { ascending: false })
    .range(from, to);
  if (filters.categoryId) {
    const categoryId = idSchema.safeParse(filters.categoryId);
    if (!categoryId.success) return validationFailure(categoryId);
    query = query.eq("category_id", categoryId.data);
  }
  if (filters.startDate) {
    if (Number.isNaN(Date.parse(filters.startDate))) return fail("Invalid start date");
    query = query.gte("expense_date", filters.startDate.slice(0, 10));
  }
  if (filters.endDate) {
    if (Number.isNaN(Date.parse(filters.endDate))) return fail("Invalid end date");
    query = query.lt("expense_date", filters.endDate.slice(0, 10));
  }
  const search = filters.search?.trim().slice(0, 100);
  if (search) query = query.ilike("description", `%${search}%`);
  const { data, error, count } = await query;
  if (error) return caught(error, "Could not load expenses");
  return ok({
    expenses: (data ?? []) as unknown as Expense[],
    count: count ?? 0,
    page,
    pageSize,
  });
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult<Expense>> {
  const auth = await getActionContext("canManageExpenses");
  if (!auth.success) return auth;
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("expenses")
      .insert({
        shop_id: auth.data.shopId,
        created_by: auth.data.user.id,
        ...expenseValues(parsed.data),
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return ok(data as unknown as Expense);
  } catch (error) {
    return caught(error, "Could not create expense");
  }
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseInput
): Promise<ActionResult<Expense>> {
  const auth = await getActionContext("canManageExpenses");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(expenseId);
  const parsed = expenseSchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("expenses")
      .update(expenseValues(parsed.data))
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return ok(data as unknown as Expense);
  } catch (error) {
    return caught(error, "Could not update expense");
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext("canManageExpenses");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(expenseId);
  if (!id.success) return validationFailure(id);
  try {
    const { data, error } = await auth.data.supabase
      .from("expenses")
      .delete()
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return ok({ id: data.id as string });
  } catch (error) {
    return caught(error, "Could not delete expense");
  }
}

export async function getExpenseCategories(
  includeInactive = false
): Promise<ActionResult<ExpenseCategory[]>> {
  const auth = await getActionContext(["canManageExpenses", "canViewReports"]);
  if (!auth.success) return auth;
  let query = auth.data.supabase
    .from("expense_categories")
    .select("*")
    .eq("shop_id", auth.data.shopId)
    .order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return caught(error, "Could not load expense categories");
  return ok((data ?? []) as unknown as ExpenseCategory[]);
}

export async function createExpenseCategory(
  input: CategoryInput
): Promise<ActionResult<ExpenseCategory>> {
  const auth = await getActionContext("canManageExpenses");
  if (!auth.success) return auth;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("expense_categories")
      .insert({
        shop_id: auth.data.shopId,
        ...parsed.data,
        description: cleanOptional(parsed.data.description),
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/expense-categories");
    revalidatePath("/expenses");
    return ok(data as unknown as ExpenseCategory);
  } catch (error) {
    return caught(error, "Could not create expense category");
  }
}

export async function updateExpenseCategory(
  categoryId: string,
  input: CategoryInput
): Promise<ActionResult<ExpenseCategory>> {
  const auth = await getActionContext("canManageExpenses");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(categoryId);
  const parsed = categorySchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);
  try {
    const { data, error } = await auth.data.supabase
      .from("expense_categories")
      .update({ ...parsed.data, description: cleanOptional(parsed.data.description) })
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/expense-categories");
    revalidatePath("/expenses");
    return ok(data as unknown as ExpenseCategory);
  } catch (error) {
    return caught(error, "Could not update expense category");
  }
}

export async function deleteExpenseCategory(
  categoryId: string
): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext("canManageSettings");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(categoryId);
  if (!id.success) return validationFailure(id);
  try {
    const { data, error } = await auth.data.supabase
      .from("expense_categories")
      .delete()
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/expense-categories");
    revalidatePath("/expenses");
    return ok({ id: data.id as string });
  } catch (error) {
    return caught(error, "Could not delete expense category");
  }
}
