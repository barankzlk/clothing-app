"use client";

import { RouteError } from "@/components/route-error";

export default function FavoritesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="Couldn't load favorites" />;
}
