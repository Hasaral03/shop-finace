import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-6"><Skeleton className="h-8 w-32" /><TableSkeleton rows={8} columns={6} /></div>; }
