import { ShopSettingsForm } from "@/components/settings/shop-settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";

export default async function SettingsPage() {
  const { shop } = await requireRole(["owner"]);
  if (!shop) throw new Error("Shop settings are unavailable");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage business identity, regional defaults, tax, inventory rules, and receipt details."
      />
      <ShopSettingsForm shop={shop} />
    </div>
  );
}
