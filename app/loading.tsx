import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
