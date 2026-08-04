import { InviteStaffForm } from "@/components/staff/invite-staff-form";
import { StaffTable } from "@/components/staff/staff-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import type { Profile } from "@/types/application";

export default async function StaffPage() {
  const { supabase, user, profile } = await requireRole(["owner"]);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("shop_id", profile.shop_id!)
    .order("is_active", { ascending: false })
    .order("full_name");
  if (error) throw new Error("Could not load staff");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Create staff accounts and manage their access. The final active owner cannot be demoted or deactivated."
      />
      <InviteStaffForm />
      <StaffTable staff={(data ?? []) as Profile[]} currentUserId={user.id} />
    </div>
  );
}
