export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        <div className="space-y-4">
          <div className="aspect-square max-h-[400px] bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded animate-pulse mt-4" />
          <div className="flex gap-2 mt-4">
            <div className="h-10 w-16 bg-muted rounded animate-pulse" />
            <div className="h-10 w-16 bg-muted rounded animate-pulse" />
            <div className="h-10 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-3 mt-6">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
