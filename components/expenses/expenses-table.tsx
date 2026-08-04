"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/types/application";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { ExpenseForm } from "./expense-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ExpensesTable({ expenses, categories, count, page, pageSize, currency, timezone, canManage, filters }: {
  expenses: Expense[]; categories: ExpenseCategory[]; count: number; page: number; pageSize: number; currency: string; timezone: string; canManage: boolean; filters: Record<string, string | undefined>;
}) {
  const router = useRouter(); const current = useSearchParams();
  const go = (next: number) => { const query = new URLSearchParams(current); query.set("page", String(next)); router.push(`/expenses?${query}`); };
  async function remove(id: string) {
    const result = await deleteExpense(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense deleted");
    router.refresh();
  }
  return <div className="overflow-hidden rounded-xl border bg-card">
    <form className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-5"><Input name="search" defaultValue={filters.search} placeholder="Search description" /><select name="categoryId" defaultValue={filters.categoryId ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Input type="date" name="startDate" defaultValue={filters.startDate} /><Input type="date" name="endDate" defaultValue={filters.endDate} /><Button type="submit">Filter</Button></form>
    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead>{canManage && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>
      {expenses.length ? expenses.map((expense) => <TableRow key={expense.id}><TableCell>{formatDate(expense.expense_date, timezone)}</TableCell><TableCell className="max-w-80 truncate font-medium">{expense.description}</TableCell><TableCell>{expense.expense_categories?.name ?? "Uncategorized"}</TableCell><TableCell className="capitalize">{expense.payment_method?.replaceAll("_", " ") ?? "—"}</TableCell><TableCell>{formatCurrency(expense.amount, currency)}</TableCell>{canManage && <TableCell><div className="flex justify-end gap-1"><ExpenseForm categories={categories} expense={expense} trigger={<Button variant="ghost" size="icon-sm" aria-label="Edit expense"><Pencil /></Button>} /><ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete expense"><Trash2 /></Button>} title="Delete expense?" description="This removes the expense from financial reports." onConfirm={() => remove(expense.id)} /></div></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center text-muted-foreground">No expenses found.</TableCell></TableRow>}
    </TableBody></Table><DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={go} />
  </div>;
}
