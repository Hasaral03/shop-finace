import { PosTerminal, type PosProduct } from "@/components/pos/pos-terminal";
import { getCategories } from "@/lib/actions/categories";
import { getCustomers } from "@/lib/actions/customers";
import { listProducts } from "@/lib/actions/products";
import { requireRouteAccess } from "@/lib/auth";

export default async function PosPage() {
  const { shop } = await requireRouteAccess("/pos");
  const [firstProducts, categoriesResult, firstCustomers] = await Promise.all([
    listProducts({ forPos: true, active: true, page: 1, pageSize: 100 }),
    getCategories(),
    getCustomers({ active: true, page: 1, pageSize: 100 }),
  ]);

  const productPages =
    firstProducts.success && firstProducts.data.count > 100
      ? await Promise.all(
          Array.from(
            { length: Math.ceil(firstProducts.data.count / 100) - 1 },
            (_, index) =>
              listProducts({ forPos: true, active: true, page: index + 2, pageSize: 100 })
          )
        )
      : [];
  const customerPages =
    firstCustomers.success && firstCustomers.data.count > 100
      ? await Promise.all(
          Array.from(
            { length: Math.ceil(firstCustomers.data.count / 100) - 1 },
            (_, index) => getCustomers({ active: true, page: index + 2, pageSize: 100 })
          )
        )
      : [];

  const rawProducts = firstProducts.success
    ? [
        ...firstProducts.data.products,
        ...productPages.flatMap((result) => (result.success ? result.data.products : [])),
      ]
    : [];
  const products: PosProduct[] = rawProducts.map(
    ({
      id,
      category_id,
      name,
      sku,
      barcode,
      selling_price,
      stock_quantity,
      unit,
      image_url,
      track_inventory,
    }) => ({
      id,
      category_id,
      name,
      sku,
      barcode,
      selling_price: Number(selling_price),
      stock_quantity: Number(stock_quantity),
      unit,
      image_url,
      track_inventory,
    })
  );
  const customers = firstCustomers.success
    ? [
        ...firstCustomers.data.customers,
        ...customerPages.flatMap((result) => (result.success ? result.data.customers : [])),
      ]
    : [];

  return (
    <PosTerminal
      products={products}
      categories={categoriesResult.success ? categoriesResult.data : []}
      customers={customers}
      shop={{
        currency: shop?.currency ?? "LKR",
        taxRate: Number(shop?.tax_rate ?? 0),
        allowNegativeStock: Boolean(shop?.allow_negative_stock),
      }}
      loadError={
        !firstProducts.success
          ? firstProducts.error
          : !categoriesResult.success
            ? categoriesResult.error
            : !firstCustomers.success
              ? firstCustomers.error
              : null
      }
    />
  );
}
