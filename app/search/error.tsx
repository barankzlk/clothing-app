"use client";

import { RouteError } from "@/components/route-error";

export default function SearchError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="Couldn't load search" />;
}
