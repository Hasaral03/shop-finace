import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCategories } from "@/lib/actions/categories";
import { requireRouteAccess } from "@/lib/auth";
import type { Product } from "@/types/application";
import { ProductForm } from "@/components/products/product-form";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { supabase, profile } = await requireRouteAccess(`/products/${productId}`);
  const [categories, productResult] = await Promise.all([
    getCategories(true),
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("shop_id", profile.shop_id!)
      .maybeSingle(),
  ]);

  if (productResult.error || !productResult.data) notFound();
  const product = productResult.data as Product;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description="Update product details, pricing, and stock configuration."
        actions={<Link className={buttonVariants({ variant: "outline" })} href="/products"><ArrowLeft /> Products</Link>}
      />
      <ProductForm product={product} categories={categories.success ? categories.data : []} />
    </div>
  );
}
