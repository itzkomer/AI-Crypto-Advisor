import clsx from 'clsx';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('skeleton', className)} aria-hidden="true" />
);

/** Section-shaped placeholders so each card reserves its real height. */
export const PricesSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((row) => (
      <div key={row} className="panel-inset flex items-center gap-3 p-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-3.5 w-20" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
      </div>
    ))}
  </div>
);

export const NewsSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2, 3].map((row) => (
      <div key={row} className="space-y-2 border-b border-white/5 pb-3 last:border-0">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-28" />
      </div>
    ))}
  </div>
);

export const InsightSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-3.5 w-full" />
    <Skeleton className="h-3.5 w-full" />
    <Skeleton className="h-3.5 w-3/4" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

export const MemeSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-52 w-full rounded-xl" />
    <Skeleton className="h-3.5 w-2/3" />
  </div>
);
