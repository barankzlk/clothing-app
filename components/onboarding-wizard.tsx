"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  BOTTOM_SIZES,
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  FABRIC_PREFERENCES,
  GENDERS,
  STYLE_TAG_GROUPS,
  TOP_SIZES,
} from "@/lib/style-tags";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  BodyShapeSelector,
  NumberField,
  PillMultiSelect,
  SelectField,
  draftFromProfile,
  draftToProfilePayload,
  type ProfileDraft,
} from "@/components/profile-fields";

const STEPS = [
  { title: "About you", subtitle: "The basics, so we can address you right." },
  { title: "Your measurements", subtitle: "We only surface pieces in your size." },
  { title: "Your style", subtitle: "Pick at least three that feel like you." },
  { title: "Preferences", subtitle: "Fabrics, budget, and anything else." },
] as const;

export function OnboardingWizard({
  userId,
  email,
  initialProfile,
}: {
  userId: string;
  email: string;
  initialProfile: Profile | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    draftFromProfile(initialProfile),
  );

  function patch(partial: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function toggleInList(key: "style_tags" | "fabric_preferences", tag: string) {
    setDraft((d) => {
      const list = d[key];
      return {
        ...d,
        [key]: list.includes(tag)
          ? list.filter((t) => t !== tag)
          : [...list, tag],
      };
    });
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!draft.name.trim()) return "Please tell us your name.";
      if (!draft.gender) return "Please select how you identify.";
      const age = Number.parseInt(draft.age, 10);
      if (!draft.age.trim() || Number.isNaN(age) || age < 13 || age > 120)
        return "Please enter a valid age.";
    }
    if (index === 1) {
      if (!draft.height_cm.trim()) return "Please enter your height.";
      if (!draft.weight_kg.trim()) return "Please enter your weight.";
      if (!draft.body_shape) return "Please choose a body shape.";
      if (!draft.clothing_size_top) return "Please choose a top size.";
      if (!draft.clothing_size_bottom) return "Please choose a bottom size.";
      if (!draft.shoe_size_eu.trim()) return "Please enter your shoe size.";
    }
    if (index === 2) {
      if (draft.style_tags.length < 3)
        return "Select at least 3 style tags to continue.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    // Validate every step before completing.
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();
    const payload = draftToProfilePayload(draft);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      ...payload,
      onboarding_complete: true,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You're all set. Let's find something good.");
    router.refresh();
    router.replace("/search");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{STEPS[step]!.title}</h1>
        <p className="text-sm font-light text-muted-foreground">
          {STEPS[step]!.subtitle}
        </p>
      </div>

      <div className="min-h-[20rem] animate-fade-in" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
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
              placeholder="e.g. 28"
              unit="yrs"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Height"
                value={draft.height_cm}
                onChange={(v) => patch({ height_cm: v })}
                placeholder="175"
                unit="cm"
              />
              <NumberField
                label="Weight"
                value={draft.weight_kg}
                onChange={(v) => patch({ weight_kg: v })}
                placeholder="68"
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
                placeholder="42"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {STYLE_TAG_GROUPS.map((group) => (
              <div key={group.label} className="space-y-3">
                <Label className="text-muted-foreground">{group.label}</Label>
                <PillMultiSelect
                  options={group.tags}
                  value={draft.style_tags}
                  onToggle={(t) => toggleInList("style_tags", t)}
                />
              </div>
            ))}
            <p className="text-xs font-light text-muted-foreground">
              {draft.style_tags.length} selected · minimum 3
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Fabric preferences</Label>
              <PillMultiSelect
                options={FABRIC_PREFERENCES}
                value={draft.fabric_preferences}
                onToggle={(t) => toggleInList("fabric_preferences", t)}
              />
            </div>
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
              <div className="flex justify-between text-xs font-light text-muted-foreground">
                <span>€{BUDGET_MIN}</span>
                <span>€{BUDGET_MAX}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Anything else about your style?</Label>
              <textarea
                id="notes"
                value={draft.style_notes}
                onChange={(e) => patch({ style_notes: e.target.value })}
                placeholder="Optional — e.g. 'I avoid logos and love earthy tones.'"
                rows={3}
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-light ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 0 || saving}
          className={step === 0 ? "invisible" : ""}
        >
          <ArrowLeft /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}

/** Re-exported so the page can show a friendly summary if desired. */
export const ONBOARDING_STEP_TITLES = STEPS.map((s) => s.title);
