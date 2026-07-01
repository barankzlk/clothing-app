"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
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
import {
  BodyShapeSelector,
  NumberField,
  SelectField,
  draftFromProfile,
  draftToProfilePayload,
  type ProfileDraft,
} from "@/components/profile-fields";

const STEP_KEYS = [
  { title: "onboarding.step1Title", subtitle: "onboarding.step1Subtitle" },
  { title: "onboarding.step2Title", subtitle: "onboarding.step2Subtitle" },
  { title: "onboarding.step3Title", subtitle: "onboarding.step3Subtitle" },
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
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    draftFromProfile(initialProfile),
  );

  function patch(partial: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!draft.name.trim()) return t("onboarding.errName");
      if (!draft.gender) return t("onboarding.errGender");
      const age = Number.parseInt(draft.age, 10);
      if (!draft.age.trim() || Number.isNaN(age) || age < 13 || age > 120)
        return t("onboarding.errAge");
    }
    if (index === 1) {
      if (!draft.height_cm.trim()) return t("onboarding.errHeight");
      if (!draft.weight_kg.trim()) return t("onboarding.errWeight");
      if (!draft.body_shape) return t("onboarding.errBodyShape");
      if (!draft.clothing_size_top) return t("onboarding.errTopSize");
      if (!draft.clothing_size_bottom) return t("onboarding.errBottomSize");
      if (!draft.shoe_size_eu.trim()) return t("onboarding.errShoeSize");
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    // Validate every step before completing.
    for (let i = 0; i < STEP_KEYS.length; i++) {
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
    toast.success(t("onboarding.finishToast"));
    router.refresh();
    router.replace("/search");
  }

  const progress = ((step + 1) / STEP_KEYS.length) * 100;

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>
            {t("onboarding.stepOf", { current: step + 1, total: STEP_KEYS.length })}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t(STEP_KEYS[step]!.title)}</h1>
        <p className="text-sm font-light text-muted-foreground">
          {t(STEP_KEYS[step]!.subtitle)}
        </p>
      </div>

      <div className="min-h-[20rem] animate-fade-in" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("onboarding.nameLabel")}</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t("onboarding.namePlaceholder")}
                autoComplete="name"
                className="min-h-11"
              />
            </div>
            <SelectField
              label={t("onboarding.genderLabel")}
              placeholder={t("common.select")}
              value={draft.gender}
              onChange={(v) => patch({ gender: v })}
              options={GENDERS.map((g) => ({ value: g, label: t(`genders.${g}`) }))}
            />
            <NumberField
              label={t("onboarding.ageLabel")}
              value={draft.age}
              onChange={(v) => patch({ age: v })}
              placeholder={t("onboarding.agePlaceholder")}
              unit={t("common.years")}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label={t("onboarding.heightLabel")}
                value={draft.height_cm}
                onChange={(v) => patch({ height_cm: v })}
                placeholder="175"
                unit="cm"
              />
              <NumberField
                label={t("onboarding.weightLabel")}
                value={draft.weight_kg}
                onChange={(v) => patch({ weight_kg: v })}
                placeholder="68"
                unit="kg"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("onboarding.bodyShapeLabel")}</Label>
              <BodyShapeSelector
                value={draft.body_shape}
                onChange={(v) => patch({ body_shape: v })}
                getLabel={(v) => t(`bodyShapes.${v}`)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <SelectField
                label={t("onboarding.topSizeLabel")}
                placeholder="—"
                value={draft.clothing_size_top}
                onChange={(v) => patch({ clothing_size_top: v })}
                options={TOP_SIZES.map((s) => ({ value: s, label: s }))}
              />
              <SelectField
                label={t("onboarding.bottomSizeLabel")}
                placeholder="—"
                value={draft.clothing_size_bottom}
                onChange={(v) => patch({ clothing_size_bottom: v })}
                options={BOTTOM_SIZES.map((s) => ({ value: s, label: s }))}
              />
              <NumberField
                label={t("onboarding.shoeSizeLabel")}
                value={draft.shoe_size_eu}
                onChange={(v) => patch({ shoe_size_eu: v })}
                placeholder="42"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("onboarding.budgetLabel")}</Label>
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
          className={cn("min-h-11", step === 0 && "invisible")}
        >
          <ArrowLeft /> {t("common.back")}
        </Button>

        {step < STEP_KEYS.length - 1 ? (
          <Button onClick={next} className="min-h-11">
            {t("common.continue")} <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving} className="min-h-11">
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {t("common.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
