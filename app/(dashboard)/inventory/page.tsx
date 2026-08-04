import { AlertTriangle, Boxes, Filter, History, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { getCategories } from "@/lib/actions/categories";
import { getInventory } from "@/lib/actions/inventory";
import { requireRouteAccess } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import type { Product } from "@/types/application";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const text = (input: string | string[] | undefined, fallback = "") => typeof input === "string" ? input : fallback;

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, profile, shop } = await requireRouteAccess("/inventory");
  const params = await searchParams;
  const search = text(params.search);
  const categoryId = text(params.category);
  const stock = text(params.stock, "all") as "all" | "low" | "out";
  const page = Math.max(1, Number(text(params.page, "1")) || 1);
  const [inventory, categoriesResult, summaryResult] = await Promise.all([
    getInventory({ search, categoryId: categoryId || undefined, stock, page, pageSize: 20 }),
    getCategories(true),
    supabase
      .from("products")
      .select("stock_quantity,minimum_stock,cost_price")
      .eq("shop_id", profile.shop_id!)
      .eq("track_inventory", true),
  ]);
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));
  const summary = (summaryResult.data ?? []) as Pick<Product, "stock_quantity" | "minimum_stock" | "cost_price">[];
  const low = summary.filter((item) => item.stock_quantity > 0 && item.stock_quantity <= item.minimum_stock).length;
  const out = summary.filter((item) => item.stock_quantity <= 0).length;
  const value = summary.reduce((total, item) => total + item.stock_quantity * item.cost_price, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor current stock, warnings, and inventory value."
        actions={<Link href="/stock-movements" className={buttonVariants({ variant: "outline" })}><History /> Movement history</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="size-4" /> Tracked products</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(summary.length)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /> Low stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(low)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-destructive" /> Out of stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(out)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Inventory value</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatCurrency(value, shop?.currency ?? "LKR")}</CardContent></Card>
      </div>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_220px_180px_auto]">
        <div className="relative"><Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input name="search" defaultValue={search} placeholder="Search inventory" className="pl-8" /></div>
        <select name="category" defaultValue={categoryId} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select name="stock" defaultValue={stock} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        <button type="submit" className={cn(buttonVariants(), "w-full")}><Filter /> Apply</button>
      </form>
      {!inventory.success ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{inventory.error}</div>
      ) : (
        <InventoryTable products={inventory.data.products} categoryNames={categoryNames} currency={shop?.currency ?? "LKR"} count={inventory.data.count} page={inventory.data.page} pageSize={inventory.data.pageSize} />
      )}
    </div>
  );
}
