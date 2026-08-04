import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value?: ReactNode;
  percentChange?: number | null;
  changeLabel?: string;
  icon?: LucideIcon;
  loading?: boolean;
  error?: string | boolean;
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  percentChange,
  changeLabel = "from previous period",
  icon: Icon,
  loading,
  error,
  empty,
  emptyLabel = "No data available",
  className,
}: MetricCardProps) {
  const hasChange = percentChange != null;
  const isUp = Number(percentChange) >= 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon ? (
          <CardAction className="rounded-lg bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" role="status" aria-label={`Loading ${label}`}>
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-44" />
          </div>
        ) : error ? (
          <p className="text-sm text-danger">
            {typeof error === "string" ? error : "Unable to load this metric"}
          </p>
        ) : empty || value == null ? (
          <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {value}
            </div>
            {hasChange ? (
              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center font-medium",
                    isUp ? "text-success" : "text-danger"
                  )}
                >
                  {isUp ? <ArrowUpRight /> : <ArrowDownRight />}
                  {formatPercent(percentChange)}
                </span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
