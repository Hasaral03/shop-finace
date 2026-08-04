import { Plus } from "lucide-react";

import { getCategories } from "@/lib/actions/categories";
import { requireRouteAccess } from "@/lib/auth";
import { CategoriesTable } from "@/components/products/categories-table";
import { CategoryForm } from "@/components/products/category-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default async function CategoriesPage() {
  await requireRouteAccess("/categories");
  const result = await getCategories(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize the catalog and control which groups are available."
        actions={
          <CategoryForm trigger={<Button type="button"><Plus /> New category</Button>} />
        }
      />
      {!result.success ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : (
        <CategoriesTable categories={result.data} />
      )}
    </div>
  );
}
