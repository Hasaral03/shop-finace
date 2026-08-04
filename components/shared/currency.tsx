import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface CurrencyProps {
  value: number | string | null | undefined;
  currency?: string;
  locale?: string;
  className?: string;
}

export function Currency({
  value,
  currency,
  locale,
  className,
}: CurrencyProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatCurrency(value, currency, locale)}
    </span>
  );
}
