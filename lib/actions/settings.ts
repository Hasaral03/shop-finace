"use server";

import { revalidatePath } from "next/cache";
import { shopSettingsSchema, type ShopSettingsInput } from "@/lib/validations";
import { ok, type ActionResult } from "@/lib/auth";
import type { Shop } from "@/types/application";
import {
  caught,
  cleanOptional,
  getActionContext,
  validationFailure,
} from "./_shared";

export async function updateShopSettings(
  input: ShopSettingsInput
): Promise<ActionResult<Shop>> {
  const auth = await getActionContext("canManageSettings");
  if (!auth.success) return auth;
  const parsed = shopSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed);

  try {
    const { data, error } = await auth.data.supabase
      .from("shops")
      .update({
        ...parsed.data,
        name: parsed.data.name.trim(),
        phone: cleanOptional(parsed.data.phone),
        email: cleanOptional(parsed.data.email),
        address: cleanOptional(parsed.data.address),
        receipt_footer: cleanOptional(parsed.data.receipt_footer),
        business_registration_number: cleanOptional(
          parsed.data.business_registration_number
        ),
      })
      .eq("id", auth.data.shopId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/pos");
    return ok(data as Shop);
  } catch (error) {
    return caught(error, "Could not update shop settings");
  }
}
