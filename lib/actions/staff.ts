"use server";

import { revalidatePath } from "next/cache";
import { staffInviteSchema, type StaffInviteInput } from "@/lib/validations";
import { createServiceClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/auth";
import type { Profile, UserRole } from "@/types/application";
import {
  caught,
  getActionContext,
  idSchema,
  validationFailure,
} from "./_shared";

const allowedRoles: readonly UserRole[] = ["owner", "manager", "cashier", "accountant"];

async function wouldRemoveLastOwner(
  supabase: Awaited<ReturnType<typeof getActionContext>> extends ActionResult<infer T>
    ? T extends { supabase: infer S }
      ? S
      : never
    : never,
  shopId: string,
  target: Profile
): Promise<boolean> {
  if (target.role !== "owner" || !target.is_active) return false;
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("role", "owner")
    .eq("is_active", true);
  if (error) throw error;
  return (count ?? 0) <= 1;
}

export async function inviteStaff(
  input: StaffInviteInput
): Promise<ActionResult<Profile>> {
  const auth = await getActionContext("canManageStaff");
  if (!auth.success) return auth;
  const parsed = staffInviteSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  let service: ReturnType<typeof createServiceClient> | null = null;
  let createdUserId: string | null = null;
  try {
    service = createServiceClient();
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: parsed.data.email.toLowerCase().trim(),
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.full_name.trim(),
        role: parsed.data.role,
        shop_id: auth.data.shopId,
      },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("Staff account was not created");
    createdUserId = created.user.id;

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .upsert({
        id: created.user.id,
        shop_id: auth.data.shopId,
        full_name: parsed.data.full_name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        role: parsed.data.role,
        is_active: true,
      })
      .select()
      .single();
    if (profileError) throw profileError;

    revalidatePath("/staff");
    return ok(profile as Profile);
  } catch (error) {
    if (createdUserId && service) await service.auth.admin.deleteUser(createdUserId);
    return caught(error, "Could not invite staff member");
  }
}

export async function updateStaffRole(
  staffId: string,
  role: UserRole
): Promise<ActionResult<Profile>> {
  const auth = await getActionContext("canManageStaff");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(staffId);
  if (!id.success) return validationFailure(id);
  if (!allowedRoles.includes(role)) return fail("Invalid staff role");

  try {
    const { data: target, error: targetError } = await auth.data.supabase
      .from("profiles")
      .select("*")
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .single();
    if (targetError) throw targetError;
    const profile = target as Profile;
    if (profile.role === "owner" && role !== "owner") {
      if (await wouldRemoveLastOwner(auth.data.supabase, auth.data.shopId, profile)) {
        return fail("The last active owner cannot be demoted");
      }
    }

    const { data, error } = await auth.data.supabase
      .from("profiles")
      .update({ role })
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/staff");
    return ok(data as Profile);
  } catch (error) {
    return caught(error, "Could not update staff role");
  }
}

export async function setStaffActive(
  staffId: string,
  isActive: boolean
): Promise<ActionResult<Profile>> {
  const auth = await getActionContext("canManageStaff");
  if (!auth.success) return auth;
  const id = idSchema.safeParse(staffId);
  if (!id.success) return validationFailure(id);

  try {
    const { data: target, error: targetError } = await auth.data.supabase
      .from("profiles")
      .select("*")
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .single();
    if (targetError) throw targetError;
    const profile = target as Profile;
    if (!isActive && (await wouldRemoveLastOwner(auth.data.supabase, auth.data.shopId, profile))) {
      return fail("The last active owner cannot be deactivated");
    }

    const { data, error } = await auth.data.supabase
      .from("profiles")
      .update({ is_active: Boolean(isActive) })
      .eq("id", id.data)
      .eq("shop_id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/staff");
    return ok(data as Profile);
  } catch (error) {
    return caught(error, "Could not change staff status");
  }
}
