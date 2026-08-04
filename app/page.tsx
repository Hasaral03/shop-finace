import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultRoute } from "@/lib/permissions";
import type { UserRole } from "@/types/application";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(getDefaultRoute((profile?.role as UserRole) || "cashier"));
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_oklch(0.96_0.02_200),_oklch(0.93_0.01_240)_45%,_oklch(0.97_0.005_100))] px-6 dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.22_0.03_220),_oklch(0.16_0.02_250)_50%,_oklch(0.14_0.01_260))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.7_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.7_0_0/0.06)_1px,transparent_1px)] bg-size-[28px_28px]" />
      <div className="relative z-10 max-w-xl text-center">
        <p className="mb-3 text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Retail operations
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Shop Finance
        </h1>
        <p className="mb-8 text-muted-foreground">
          Manage products, inventory, POS sales, purchases, expenses, and
          financial reports for your retail shop — powered by Supabase.
        </p>
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "px-8")}>
          Sign in to continue
        </Link>
      </div>
    </div>
  );
}
