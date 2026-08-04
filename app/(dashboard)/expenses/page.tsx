import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRouteAccess } from "@/lib/auth";
import { getExpenseCategories, getExpenses } from "@/lib/actions/expenses";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { Button, buttonVariants } from "@/components/ui/button";

type Query = Record<string, string | string[] | undefined>; const text = (v: string | string[] | undefined) => typeof v === "string" ? v : undefined;
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [{ profile, shop }, query] = await Promise.all([requireRouteAccess("/expenses"), searchParams]);
  const filters = { search: text(query.search), categoryId: text(query.categoryId), startDate: text(query.startDate), endDate: text(query.endDate) };
  const [result, categoryResult] = await Promise.all([getExpenses({ ...filters, page: Number(text(query.page) ?? 1), pageSize: 20 }), getExpenseCategories()]);
  if (!result.success) throw new Error(result.error); const categories = categoryResult.success ? categoryResult.data : []; const canManage = profile.role === "owner" || profile.role === "accountant";
  return <div className="space-y-6"><PageHeader title="Expenses" description="Record and review operating costs." actions={canManage ? <><Link href="/expense-categories" className={buttonVariants({ variant: "outline" })}>Categories</Link><ExpenseForm categories={categories} trigger={<Button><Plus /> Add expense</Button>} /></> : undefined} /><ExpensesTable {...result.data} categories={categories} currency={shop?.currency ?? "LKR"} timezone={shop?.timezone ?? "Asia/Colombo"} canManage={canManage} filters={filters} /></div>;
}
