import { Skeleton } from "@/components/ui/skeleton";

export default function PosLoading() {
  return (
    <div className="-m-4 grid min-h-full md:-m-6 xl:grid-cols-[minmax(0,1fr)_420px]" role="status" aria-label="Loading point of sale">
      <section className="space-y-4 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </section>
      <aside className="space-y-4 border-t p-4 xl:border-t-0 xl:border-l">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-12 w-full" />
      </aside>
      <span className="sr-only">Loading products and customers</span>
    </div>
  );
}
