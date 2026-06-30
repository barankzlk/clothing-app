"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function routeAfterAuth(userId: string) {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .maybeSingle();

    router.refresh();
    if (profile?.onboarding_complete) {
      router.replace("/search");
    } else {
      router.replace("/onboarding");
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) {
      await routeAfterAuth(data.user.id);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmation is disabled, a session is returned immediately.
    if (data.session && data.user) {
      toast.success("Account created. Let's set up your profile.");
      await routeAfterAuth(data.user.id);
      return;
    }
    // Otherwise the user must confirm via email first.
    toast.success("Check your inbox to confirm your email, then sign in.");
    setMode("signin");
  }

  return (
    <Tabs
      value={mode}
      onValueChange={(v) => setMode(v as Mode)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>

      <TabsContent value="signin" className="mt-6">
        <form onSubmit={handleSignIn} className="space-y-4">
          <Field
            id="signin-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            id="signin-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="mt-6">
        <form onSubmit={handleSignUp} className="space-y-4">
          <Field
            id="signup-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            id="signup-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint="At least 6 characters."
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create account
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      {hint && <p className="text-xs font-light text-muted-foreground">{hint}</p>}
    </div>
  );
}
