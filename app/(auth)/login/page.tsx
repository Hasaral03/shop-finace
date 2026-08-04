import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_oklch(0.96_0.02_200),_oklch(0.93_0.01_240)_45%,_oklch(0.97_0.005_100))] p-4 dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.22_0.03_220),_oklch(0.16_0.02_250)_50%,_oklch(0.14_0.01_260))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.7_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.7_0_0/0.06)_1px,transparent_1px)] bg-size-[28px_28px]" />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
