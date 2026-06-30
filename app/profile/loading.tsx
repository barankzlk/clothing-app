import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
