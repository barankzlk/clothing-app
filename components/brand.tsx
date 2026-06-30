import Link from "next/link";
import { cn } from "@/lib/utils";

/** The YAZ wordmark. Editorial, letter-spaced, no decoration. */
export function Brand({
  className,
  href = "/search",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex select-none items-center text-lg font-semibold tracking-[0.3em] text-ink",
        className,
      )}
      aria-label="YAZ home"
    >
      YAZ
    </Link>
  );
}
