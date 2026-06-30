import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 lg:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-96 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
