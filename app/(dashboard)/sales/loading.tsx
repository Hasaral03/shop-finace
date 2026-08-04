import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-80 max-w-full" /></div><TableSkeleton rows={8} columns={7} /></div>;
}
