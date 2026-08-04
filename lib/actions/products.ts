"use server";

import { revalidatePath } from "next/cache";
import { productSchema, type ProductInput } from "@/lib/validations";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Product } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  idSchema,
  pageRange,
  validationFailure,
} from "./_shared";

type ListedProduct = Omit<Product, "cost_price"> & { cost_price: number | null };
type ProductFilters = {
  search?: string;
  categoryId?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  forPos?: boolean;
};

function productValues(input: ProductInput) {
  return {
    ...input,
    description: cleanOptional(input.description),
    sku: cleanOptional(input.sku),
    barcode: cleanOptional(input.barcode),
  };
}

export async function createProduct(input: ProductInput): Promise<ActionResult<Product>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  try {
    const { data, error } = await auth.data.supabase
      .from("products")
      .insert({ shop_id: auth.data.shopId, ...productValues(parsed.data) })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return ok(data as Product);
  } catch (error) {
    return caught(error, "Could not create product");
  }
}

export async function updateProduct(
  productId: string,
  input: ProductInput
): Promise<ActionResult<Product>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(productId);
  const parsed = productSchema.safeParse(input);
  if (!id.success) return validationFailure(id);
  if (!parsed.success) return validationFailure(parsed);

  try {
    const { data, error } = await auth.data.supabase
      .from("products")
      .update(productValues(parsed.data))
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return ok(data as Product);
  } catch (error) {
    return caught(error, "Could not update product");
  }
}

export async function toggleProductActive(
  productId: string,
  isActive: boolean
): Promise<ActionResult<Product>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(productId);
  if (!id.success) return validationFailure(id);

  try {
    const { data, error } = await auth.data.supabase
      .from("products")
      .update({ is_active: Boolean(isActive) })
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return ok(data as Product);
  } catch (error) {
    return caught(error, "Could not change product status");
  }
}

export async function uploadProductImage(
  productId: string,
  file: File
): Promise<ActionResult<{ imageUrl: string }>> {
  const auth = await getActionContext("canManageProducts");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(productId);
  if (!id.success) return validationFailure(id);
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload");
  if (file.size > 5 * 1024 * 1024) return fail("Image must be 5 MB or smaller");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return fail("Only JPEG, PNG, WebP, and GIF images are supported");
  }

  const { data: product, error: productError } = await auth.data.supabase
    .from("products")
    .select("id")
    .eq("id", id.data)
    .eq("shop_id", auth.data.shopId)
    .single();
  if (productError || !product) return fail("Product not found");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${auth.data.shopId}/${id.data}/${crypto.randomUUID()}.${extension}`;

  try {
    const { error: uploadError } = await auth.data.supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = auth.data.supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    const { error: updateError } = await auth.data.supabase
      .from("products")
      .update({ image_url: publicUrl.publicUrl })
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId);
    if (updateError) {
      await auth.data.supabase.storage.from("product-images").remove([path]);
      throw updateError;
    }

    revalidatePath("/products");
    revalidatePath("/pos");
    return ok({ imageUrl: publicUrl.publicUrl });
  } catch (error) {
    return caught(error, "Could not upload product image");
  }
}

export async function listProducts(
  filters: ProductFilters = {}
): Promise<ActionResult<{ products: ListedProduct[]; count: number; page: number; pageSize: number }>> {
  const auth = await getActionContext(["canManageProducts", "canCreateSales", "canViewReports"]);
  if (!auth.success) return auth;
  const { page, pageSize, from, to } = pageRange(filters.page, filters.pageSize);
  const usePosView = filters.forPos || auth.data.profile.role === "cashier";
  const search = filters.search?.trim().slice(0, 100);
  let categoryId: string | undefined;
  if (filters.categoryId) {
    const parsedCategoryId = idSchema.safeParse(filters.categoryId);
    if (!parsedCategoryId.success) return validationFailure(parsedCategoryId);
    categoryId = parsedCategoryId.data;
  }

  try {
    if (usePosView) {
      let posQuery = auth.data.supabase
        .from("products_pos")
        .select("*", { count: "exact" })
        .eq("shop_id", auth.data.shopId)
        .eq("is_active", true)
        .order("name")
        .range(from, to);
      if (search) {
        posQuery = posQuery.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`
        );
      }
      if (categoryId) posQuery = posQuery.eq("category_id", categoryId);
      const { data, error, count } = await posQuery;
      if (error) throw error;
      return ok({
        products: (data ?? []) as ListedProduct[],
        count: count ?? 0,
        page,
        pageSize,
      });
    }

    let query = auth.data.supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("shop_id", auth.data.shopId)
      .order("name")
      .range(from, to);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`
      );
    }
    if (categoryId) query = query.eq("category_id", categoryId);
    if (typeof filters.active === "boolean") query = query.eq("is_active", filters.active);
    const { data, error, count } = await query;
    if (error) throw error;
    return ok({
      products: (data ?? []) as ListedProduct[],
      count: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return caught(error, "Could not load products");
  }
}
