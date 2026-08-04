"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/types/application";
import { expenseSchema, type ExpenseInput } from "@/lib/validations";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExpenseForm({ categories, expense, trigger }: { categories: ExpenseCategory[]; expense?: Expense; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ExpenseInput>({ resolver: zodResolver(expenseSchema), defaultValues: { category_id: expense?.category_id ?? null, amount: expense?.amount ?? 0, description: expense?.description ?? "", payment_method: expense?.payment_method ?? undefined, expense_date: expense?.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10) } });
  const categoryId = useWatch({ control: form.control, name: "category_id" });
  async function submit(values: ExpenseInput) {
    const result = expense ? await updateExpense(expense.id, values) : await createExpense(values);
    if (!result.success) return toast.error(result.error);
    toast.success(expense ? "Expense updated" : "Expense added"); setOpen(false); if (!expense) form.reset();
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger} /><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle><DialogDescription>Record an operating cost for reporting.</DialogDescription></DialogHeader>
    <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
      <div className="space-y-1"><Label>Category</Label><select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={categoryId ?? ""} onChange={(e) => form.setValue("category_id", e.target.value || null)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Amount</Label><Input type="number" min="0.01" step="0.01" {...form.register("amount")} />{form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}</div><div className="space-y-1"><Label>Date</Label><Input type="date" {...form.register("expense_date")} /></div></div>
      <div className="space-y-1"><Label>Payment method</Label><select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" {...form.register("payment_method")}><option value="">Not specified</option>{["cash","card","bank_transfer","credit","online_payment","other"].map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></div>
      <div className="space-y-1"><Label>Description</Label><Textarea {...form.register("description")} />{form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}</div>
      <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save expense"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
