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
  GENDERS,
  TOP_SIZES,
} from "@/lib/style-tags";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useLocale } from "@/lib/i18n/locale-context";
import { tagLabel } from "@/lib/i18n/tag-labels";
import {
  BodyShapeSelector,
  NumberField,
  SelectField,
  draftFromProfile,
  draftToProfilePayload,
  type ProfileDraft,
} from "@/components/profile-fields";

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
  const { t, locale } = useLocale();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    draftFromProfile(initialProfile),
  );

  const STEPS = [
    { title: t("onboarding.stepAboutTitle"), subtitle: t("onboarding.stepAboutSubtitle") },
    {
      title: t("onboarding.stepMeasurementsTitle"),
      subtitle: t("onboarding.stepMeasurementsSubtitle"),
    },
    { title: t("onboarding.stepBudgetTitle"), subtitle: t("onboarding.stepBudgetSubtitle") },
  ] as const;

  function patch(partial: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!draft.name.trim()) return t("onboarding.errorName");
      if (!draft.gender) return t("onboarding.errorGender");
      const age = Number.parseInt(draft.age, 10);
      if (!draft.age.trim() || Number.isNaN(age) || age < 13 || age > 120)
        return t("onboarding.errorAge");
    }
    if (index === 1) {
      if (!draft.height_cm.trim()) return t("onboarding.errorHeight");
      if (!draft.weight_kg.trim()) return t("onboarding.errorWeight");
      if (!draft.body_shape) return t("onboarding.errorBodyShape");
      if (!draft.clothing_size_top) return t("onboarding.errorTopSize");
      if (!draft.clothing_size_bottom) return t("onboarding.errorBottomSize");
      if (!draft.shoe_size_eu.trim()) return t("onboarding.errorShoeSize");
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
    toast.success(t("onboarding.done"));
    router.refresh();
    router.replace("/search");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>
            {t("onboarding.stepOf", { current: step + 1, total: STEPS.length })}
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
              <Label htmlFor="name">{t("onboarding.name")}</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t("onboarding.namePlaceholder")}
                autoComplete="name"
              />
            </div>
            <SelectField
              label={t("onboarding.gender")}
              placeholder={t("onboarding.genderPlaceholder")}
              value={draft.gender}
              onChange={(v) => patch({ gender: v })}
              options={GENDERS.map((g) => ({
                value: g.value,
                label: tagLabel(g.value, locale),
              }))}
            />
            <NumberField
              label={t("onboarding.age")}
              value={draft.age}
              onChange={(v) => patch({ age: v })}
              placeholder={t("onboarding.agePlaceholder")}
              unit={t("onboarding.ageUnit")}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label={t("onboarding.height")}
                value={draft.height_cm}
                onChange={(v) => patch({ height_cm: v })}
                placeholder={t("onboarding.heightPlaceholder")}
                unit="cm"
              />
              <NumberField
                label={t("onboarding.weight")}
                value={draft.weight_kg}
                onChange={(v) => patch({ weight_kg: v })}
                placeholder={t("onboarding.weightPlaceholder")}
                unit="kg"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("onboarding.bodyShape")}</Label>
              <BodyShapeSelector
                value={draft.body_shape}
                onChange={(v) => patch({ body_shape: v })}
                labelFor={(shape) => tagLabel(shape.value, locale)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <SelectField
                label={t("onboarding.topSize")}
                placeholder="—"
                value={draft.clothing_size_top}
                onChange={(v) => patch({ clothing_size_top: v })}
                options={TOP_SIZES.map((s) => ({ value: s, label: s }))}
              />
              <SelectField
                label={t("onboarding.bottomSize")}
                placeholder="—"
                value={draft.clothing_size_bottom}
                onChange={(v) => patch({ clothing_size_bottom: v })}
                options={BOTTOM_SIZES.map((s) => ({ value: s, label: s }))}
              />
              <NumberField
                label={t("onboarding.shoeSize")}
                value={draft.shoe_size_eu}
                onChange={(v) => patch({ shoe_size_eu: v })}
                placeholder={t("onboarding.shoeSizePlaceholder")}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("onboarding.defaultBudget")}</Label>
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
          <ArrowLeft /> {t("onboarding.back")}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            {t("onboarding.continueBtn")} <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {t("onboarding.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
