"use client";

import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/i18n/locale-context";

export default function AuthPage() {
  const { t } = useLocale();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in space-y-8">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>

        <div className="space-y-3 text-center">
          <Brand href="/auth" className="justify-center" />
          <p className="text-sm font-normal text-muted-foreground">
            {t("auth.tagline")}
          </p>
        </div>

        <Card className="p-6">
          <AuthForm />
        </Card>

        <p className="text-center text-xs font-normal text-muted-foreground">
          {t("auth.disclaimer")}
        </p>
      </div>
    </main>
  );
}
