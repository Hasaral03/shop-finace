import { LoadingSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading products">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-8 w-28" />
      </div>
      <LoadingSkeleton count={4} className="md:hidden" />
      <TableSkeleton rows={8} columns={7} className="hidden md:block" />
    </div>
  );
}
