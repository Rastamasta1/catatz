import { Skeleton } from "@/components/ui/skeleton";

export default function TransaksiDetailLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Navigation & Actions Skeleton */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-28 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Hero Nominal Card Skeleton */}
      <div className="rounded-[20px] p-6 border border-hairline bg-surface-soft dark:bg-surface-dark-elevated flex flex-col items-center space-y-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md mt-1" />
        <Skeleton className="h-6 w-24 rounded-full mt-2" />
      </div>

      {/* Account Card Skeleton */}
      <div className="rounded-[20px] p-4 border border-hairline bg-card flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Grid Metadata Skeleton */}
      <div className="rounded-[20px] p-4 border border-hairline bg-card space-y-3">
        <div className="flex justify-between py-2 border-b border-hairline">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="flex justify-between py-2 border-b border-hairline">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="flex justify-between py-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-36 rounded" />
        </div>
      </div>
    </div>
  );
}
