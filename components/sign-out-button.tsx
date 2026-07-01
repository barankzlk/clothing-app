"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useLocale();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/auth");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      className={cn("text-muted-foreground", className)}
    >
      <LogOut className="size-4" /> {t("common.signOut")}
    </Button>
  );
}
