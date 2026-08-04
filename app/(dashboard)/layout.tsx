import { requireAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobilePosFab } from "@/components/layout/mobile-pos-fab";
import { redirect } from "next/navigation";
import type { Shop } from "@/types/application";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, shop } = await requireAuth();

  if (!shop) {
    redirect("/login?error=no_shop");
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden md:block">
        <AppSidebar role={profile.role} shopName={shop.name} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader profile={profile} shop={shop as Shop} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <MobilePosFab role={profile.role} />
    </div>
  );
}
