import { ProductGridSkeleton } from '@/components/ui/skeleton-loader';

export default function CategoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
      <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
      <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex justify-between mb-6">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-48 bg-muted rounded animate-pulse" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
