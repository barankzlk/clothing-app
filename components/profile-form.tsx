"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  BOTTOM_SIZES,
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  GENDERS,
  TOP_SIZES,
} from "@/lib/style-tags";
import type { Profile } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  BodyShapeSelector,
  NumberField,
  SelectField,
  draftFromProfile,
  draftToProfilePayload,
  type ProfileDraft,
} from "@/components/profile-fields";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm font-light text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(profile.updated_at);
  const initial = useMemo(() => draftFromProfile(profile), [profile]);
  const [draft, setDraft] = useState<ProfileDraft>(initial);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  function patch(partial: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(draftToProfilePayload(draft))
      .eq("id", profile.id)
      .select("updated_at")
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.updated_at) setUpdatedAt(data.updated_at);
    toast.success("Profile saved.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-light text-muted-foreground">
        Profile last updated: {timeAgo(updatedAt)}
      </p>

      <Section title="About you">
        <div className="space-y-2">
          <Label htmlFor="p-name">Name</Label>
          <Input
            id="p-name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Your name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Gender"
            placeholder="Select…"
            value={draft.gender}
            onChange={(v) => patch({ gender: v })}
            options={GENDERS}
          />
          <NumberField
            label="Age"
            value={draft.age}
            onChange={(v) => patch({ age: v })}
            unit="yrs"
          />
        </div>
      </Section>

      <Section
        title="Measurements"
        description="Used to keep results in your size."
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Height"
            value={draft.height_cm}
            onChange={(v) => patch({ height_cm: v })}
            unit="cm"
          />
          <NumberField
            label="Weight"
            value={draft.weight_kg}
            onChange={(v) => patch({ weight_kg: v })}
            unit="kg"
          />
        </div>
        <div className="space-y-2">
          <Label>Body shape</Label>
          <BodyShapeSelector
            value={draft.body_shape}
            onChange={(v) => patch({ body_shape: v })}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SelectField
            label="Top size"
            placeholder="—"
            value={draft.clothing_size_top}
            onChange={(v) => patch({ clothing_size_top: v })}
            options={TOP_SIZES.map((s) => ({ value: s, label: s }))}
          />
          <SelectField
            label="Bottom (EU)"
            placeholder="—"
            value={draft.clothing_size_bottom}
            onChange={(v) => patch({ clothing_size_bottom: v })}
            options={BOTTOM_SIZES.map((s) => ({ value: s, label: s }))}
          />
          <NumberField
            label="Shoe (EU)"
            value={draft.shoe_size_eu}
            onChange={(v) => patch({ shoe_size_eu: v })}
          />
        </div>
      </Section>

      <Section
        title="Budget"
        description="Your default per-item budget — you can still adjust it per search."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default budget per item</Label>
            <span className="text-sm font-medium">
              €{draft.budget_max_eur}
            </span>
          </div>
          <Slider
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            value={[draft.budget_max_eur]}
            onValueChange={([v]) => patch({ budget_max_eur: v ?? BUDGET_MIN })}
          />
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-line bg-canvas/90 px-1 py-4 backdrop-blur">
        {dirty && (
          <span className="text-xs font-light text-muted-foreground">
            Unsaved changes
          </span>
        )}
        <Button onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
