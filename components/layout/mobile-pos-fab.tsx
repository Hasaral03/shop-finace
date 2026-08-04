"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/application";

export function MobilePosFab({ role }: { role: UserRole }) {
  if (!canAccessRoute(role, "/pos")) return null;

  return (
    <Link
      href="/pos"
      aria-label="Open POS"
      className={cn(
        buttonVariants({ size: "lg" }),
        "fixed bottom-5 right-5 z-40 size-14 rounded-full shadow-lg md:hidden"
      )}
    >
      <ShoppingCart className="size-6" />
    </Link>
  );
}
