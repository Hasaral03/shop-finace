import { Filter, Plus, Search } from "lucide-react";
import Link from "next/link";

import { getCategories } from "@/lib/actions/categories";
import { getInventory } from "@/lib/actions/inventory";
import { listProducts } from "@/lib/actions/products";
import { requireRouteAccess } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ProductsTable, type ProductRow } from "@/components/products/products-table";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(input: string | string[] | undefined, fallback = "") {
  return typeof input === "string" ? input : fallback;
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { profile, shop } = await requireRouteAccess("/products");
  const params = await searchParams;
  const search = value(params.search);
  const categoryId = value(params.category);
  const stock = value(params.stock, "all") as "all" | "low" | "out";
  const page = Math.max(1, Number(value(params.page, "1")) || 1);
  const pageSize = 20;

  const [categoriesResult, productsResult] = await Promise.all([
    getCategories(true),
    stock === "low" || stock === "out"
      ? getInventory({ search, categoryId: categoryId || undefined, stock, page, pageSize })
      : listProducts({ search, categoryId: categoryId || undefined, page, pageSize }),
  ]);
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage pricing, stock settings, and catalog availability."
        actions={
          <Link className={buttonVariants()} href="/products/new"><Plus /> New product</Link>
        }
      />
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_220px_180px_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input name="search" defaultValue={search} placeholder="Search name, SKU, or barcode" className="pl-8" />
        </div>
        <select name="category" defaultValue={categoryId} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="stock" defaultValue={stock} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="all">All stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="submit" className={cn(buttonVariants(), "w-full")}><Filter /> Apply</button>
      </form>
      {!productsResult.success ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{productsResult.error}</div>
      ) : (
        <ProductsTable
          products={productsResult.data.products as ProductRow[]}
          categoryNames={categoryNames}
          currency={shop?.currency ?? "LKR"}
          canViewCost={hasPermission(profile.role, "canViewCost")}
          count={productsResult.data.count}
          page={productsResult.data.page}
          pageSize={productsResult.data.pageSize}
        />
      )}
    </div>
  );
}
