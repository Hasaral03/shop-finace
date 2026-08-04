import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCategories } from "@/lib/actions/categories";
import { requireRouteAccess } from "@/lib/auth";
import { ProductForm } from "@/components/products/product-form";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function NewProductPage() {
  await requireRouteAccess("/products/new");
  const categories = await getCategories(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New product"
        description="Add an item to your catalog and configure its inventory."
        actions={<Link className={buttonVariants({ variant: "outline" })} href="/products"><ArrowLeft /> Products</Link>}
      />
      <ProductForm categories={categories.success ? categories.data : []} />
    </div>
  );
}
