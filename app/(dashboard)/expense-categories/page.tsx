import { requireRouteAccess } from "@/lib/auth";
import { getExpenseCategories } from "@/lib/actions/expenses";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryManager } from "@/components/expenses/category-manager";

export default async function ExpenseCategoriesPage() {
  const [{ profile }, result] = await Promise.all([requireRouteAccess("/expense-categories"), getExpenseCategories(true)]);
  if (!result.success) throw new Error(result.error);
  return <div className="space-y-6"><PageHeader title="Expense categories" description="Organize expenses for accurate reporting." /><CategoryManager categories={result.data} canDelete={profile.role === "owner"} /></div>;
}
