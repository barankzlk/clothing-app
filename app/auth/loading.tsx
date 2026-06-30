import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-6 w-24" />
          <Skeleton className="mx-auto h-4 w-full" />
        </div>
        <div className="space-y-4 rounded-lg border border-line bg-card p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
