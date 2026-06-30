import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { FavoritesClient } from "@/components/favorites-client";
import { Button } from "@/components/ui/button";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 lg:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <SignOutButton />
      </header>

      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">My favorites</h1>
          <p className="text-sm font-light text-muted-foreground">
            Your saved pieces, in one place.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/search">
            <ArrowLeft className="size-4" /> Search
          </Link>
        </Button>
      </div>

      <FavoritesClient initial={favorites ?? []} />
    </div>
  );
}
