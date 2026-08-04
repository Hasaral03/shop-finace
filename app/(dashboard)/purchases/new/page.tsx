import { requireRouteAccess } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/suppliers";
import { listProducts } from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/page-header";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function NewPurchasePage() {
  const [{ shop }, suppliers, products] = await Promise.all([requireRouteAccess("/purchases/new"), getSuppliers({ active: true, pageSize: 100 }), listProducts({ active: true, pageSize: 100 })]);
  return <div className="space-y-6"><PageHeader title="New purchase" description="Add multiple products in one stock receipt." /><PurchaseForm suppliers={suppliers.success ? suppliers.data.suppliers : []} products={products.success ? products.data.products.map((product) => ({ ...product, cost_price: product.cost_price ?? 0 })) : []} currency={shop?.currency ?? "LKR"} /></div>;
}
