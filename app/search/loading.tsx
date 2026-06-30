import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-[280px]">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </aside>
        <main className="min-w-0 flex-1 space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
