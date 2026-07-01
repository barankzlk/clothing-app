import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in space-y-8">
        <div className="space-y-3 text-center">
          <Brand href="/auth" className="justify-center" />
          <p className="text-sm font-light text-muted-foreground">
            Your personal fashion search. Sign in to find pieces chosen for
            your size, style, and budget.
          </p>
        </div>

        <Card className="p-6">
          <AuthForm />
        </Card>

        <p className="text-center text-xs font-light text-muted-foreground">
          By continuing you agree to receive product recommendations curated to
          your profile.
        </p>
      </div>
    </main>
  );
}
