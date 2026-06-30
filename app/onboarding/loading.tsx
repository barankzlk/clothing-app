import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-10">
      <div className="mb-10 w-full max-w-xl">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="w-full max-w-xl space-y-8">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
