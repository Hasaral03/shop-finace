import { createClient } from "@/lib/supabase/server";
import type { Profile, Shop, UserRole } from "@/types/application";
import { canAccessRoute, getDefaultRoute, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error };
}

export function sanitizeError(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("duplicate key") ||
      msg.includes("unique constraint")
    ) {
      if (msg.includes("sku")) return "SKU already exists for this shop";
      if (msg.includes("barcode")) return "Barcode already exists for this shop";
      if (msg.includes("invoice")) return "Invoice number already exists";
      return "A duplicate record already exists";
    }
    if (msg.includes("Insufficient stock")) return msg;
    if (msg.includes("Permission denied")) return "You do not have permission for this action";
    if (msg.includes("Cart is empty")) return msg;
    if (msg.includes("Product is inactive")) return msg;
    if (msg.includes("Customer required")) return msg;
    // Avoid leaking internal details
    if (msg.length < 120 && !msg.includes("stack")) return msg;
  }
  return fallback;
}

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect("/login?error=inactive");
  }

  let shop: Shop | null = null;
  if (profile.shop_id) {
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("id", profile.shop_id)
      .single();
    shop = data as Shop | null;
  }

  return {
    supabase,
    user,
    profile: profile as Profile,
    shop,
  };
}

export async function requireRole(roles: UserRole[]) {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.profile.role)) {
    redirect(getDefaultRoute(ctx.profile.role));
  }
  return ctx;
}

export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1]
) {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.profile.role, permission)) {
    redirect(getDefaultRoute(ctx.profile.role));
  }
  return ctx;
}

export async function requireRouteAccess(pathname: string) {
  const ctx = await requireAuth();
  if (!canAccessRoute(ctx.profile.role, pathname)) {
    redirect(getDefaultRoute(ctx.profile.role));
  }
  if (!ctx.profile.shop_id) {
    redirect("/login?error=no_shop");
  }
  return ctx;
}
