"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ExpenseCategory } from "@/types/application";
import { createExpenseCategory, deleteExpenseCategory, updateExpenseCategory } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function CategoryManager({ categories, canDelete }: { categories: ExpenseCategory[]; canDelete: boolean }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false);
  async function add(event: React.FormEvent) { event.preventDefault(); setBusy(true); const result = await createExpenseCategory({ name, description, is_active: true }); setBusy(false); if (!result.success) return toast.error(result.error); toast.success("Category added"); setName(""); setDescription(""); }
  async function toggle(category: ExpenseCategory, active: boolean) {
    const result = await updateExpenseCategory(category.id, { name: category.name, description: category.description ?? "", is_active: active });
    if (result.success) toast.success("Category updated");
    else toast.error(result.error);
  }
  async function remove(id: string) {
    const result = await deleteExpenseCategory(id);
    if (result.success) toast.success("Category deleted");
    else toast.error(result.error);
  }
  return <div className="grid gap-4 lg:grid-cols-[360px_1fr]"><form onSubmit={add} className="space-y-3 rounded-xl border bg-card p-4"><h2 className="font-medium">New category</h2><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required /><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" /><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add category"}</Button></form>
    <div className="overflow-hidden rounded-xl border bg-card">{categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3 border-b p-4 last:border-0"><div><p className="font-medium">{category.name}</p><p className="text-sm text-muted-foreground">{category.description || "No description"}</p></div><div className="flex items-center gap-3"><Switch checked={category.is_active} onCheckedChange={(checked) => toggle(category, checked)} aria-label={`Toggle ${category.name}`} />{canDelete && <ConfirmDialog trigger={<Button variant="destructive" size="sm">Delete</Button>} title="Delete category?" description="Categories in use cannot be deleted." onConfirm={() => remove(category.id)} />}</div></div>)}</div>
  </div>;
}
