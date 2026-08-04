import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "cards" | "table";
  count?: number;
  columns?: number;
  className?: string;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border", className)}
      role="status"
      aria-label="Loading table"
    >
      {Array.from({ length: rows + 1 }, (_, row) => (
        <div
          key={row}
          className={cn(
            "grid gap-4 border-b p-3 last:border-b-0",
            row === 0 && "bg-muted/50"
          )}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (__, column) => (
            <Skeleton
              key={column}
              className={cn("h-4", row === 0 ? "w-2/3" : "w-full")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingSkeleton({
  variant = "cards",
  count = 4,
  columns = 4,
  className,
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return <TableSkeleton rows={count} columns={columns} className={className} />;
  }

  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
      role="status"
      aria-label="Loading cards"
    >
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
