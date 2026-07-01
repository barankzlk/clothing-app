"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** App-wide toaster, styled to the DRIP palette (no shadows, 8px radius). */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-ink group-[.toaster]:border group-[.toaster]:border-line group-[.toaster]:rounded-lg group-[.toaster]:shadow-none group-[.toaster]:font-normal",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toast]:text-destructive",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
