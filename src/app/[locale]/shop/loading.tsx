import { ProductGridSkeleton } from '@/components/ui/skeleton-loader';

export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-8 w-32 bg-muted rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <div className="hidden lg:block space-y-4">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded animate-pulse mt-6" />
          <div className="h-6 w-full bg-muted rounded animate-pulse" />
        </div>
        <div>
          <div className="flex justify-end mb-6">
            <div className="h-9 w-48 bg-muted rounded animate-pulse" />
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
