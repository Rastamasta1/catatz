import { Skeleton } from "@/components/ui/skeleton";

export default function RekapLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="grid w-full grid-cols-3 gap-1 rounded-[8px] border border-hairline bg-surface-strong p-1 sm:w-80">
          <Skeleton className="h-8 rounded-[6px]" />
          <Skeleton className="h-8 rounded-[6px]" />
          <Skeleton className="h-8 rounded-[6px]" />
        </div>

        {/* Tab Content Placeholder Skeleton */}
        <div className="rounded-card border border-hairline bg-card p-6">
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
