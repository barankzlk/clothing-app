"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shared error UI for route-level error boundaries. */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    // Surface the error for debugging; in production this would go to logging.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm font-normal text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
