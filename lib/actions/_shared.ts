import { requireAuth, ok, fail, sanitizeError, type ActionResult } from "@/lib/auth";
import { hasPermission, ROLE_PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export type Permission = keyof (typeof ROLE_PERMISSIONS)["owner"];
export type ActionContext = Awaited<ReturnType<typeof requireAuth>> & {
  shopId: string;
};

export const idSchema = z.string().uuid("Invalid identifier");

export async function getActionContext(
  permissions: Permission | readonly Permission[]
): Promise<ActionResult<ActionContext>> {
  const context = await requireAuth();
  const shopId = context.profile.shop_id;
  if (!shopId) return fail("No shop is assigned to this account");

  const required = Array.isArray(permissions) ? permissions : [permissions];
  if (!required.some((permission) => hasPermission(context.profile.role, permission))) {
    return fail("You do not have permission for this action");
  }

  return ok({ ...context, shopId });
}

export function validationFailure(result: {
  success: false;
  error: z.ZodError;
}): ActionResult<never> {
  return fail(result.error.issues[0]?.message ?? "Invalid input");
}

export function caught(error: unknown, fallback: string): ActionResult<never> {
  return fail(sanitizeError(error, fallback));
}

export function pageRange(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1));
  const safePageSize = Math.min(
    100,
    Math.max(1, Math.trunc(Number.isFinite(pageSize) ? pageSize : 20))
  );
  const from = (safePage - 1) * safePageSize;
  return { page: safePage, pageSize: safePageSize, from, to: from + safePageSize - 1 };
}

export function cleanOptional(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export function parseDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return null;
  }
  return { start: start.toISOString(), end: end.toISOString() };
}
