"use client";

import { cn, humanizeTag } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BODY_SHAPES } from "@/lib/style-tags";
import type { Profile as ProfileRow } from "@/lib/types";

/**
 * The editable subset of a profile, held as form state. Numeric fields are
 * kept as strings while editing (empty string = unset) and converted on save.
 */
export type ProfileDraft = {
  name: string;
  gender: string;
  age: string;
  height_cm: string;
  weight_kg: string;
  body_shape: string;
  clothing_size_top: string;
  clothing_size_bottom: string;
  shoe_size_eu: string;
  style_tags: string[];
  fabric_preferences: string[];
  budget_max_eur: number;
  style_notes: string;
};

const numToStr = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n);

/** Build a form draft from a DB profile row. */
export function draftFromProfile(p: Partial<ProfileRow> | null): ProfileDraft {
  return {
    name: p?.name ?? "",
    gender: p?.gender ?? "",
    age: numToStr(p?.age),
    height_cm: numToStr(p?.height_cm),
    weight_kg: numToStr(p?.weight_kg),
    body_shape: p?.body_shape ?? "",
    clothing_size_top: p?.clothing_size_top ?? "",
    clothing_size_bottom: p?.clothing_size_bottom ?? "",
    shoe_size_eu: numToStr(p?.shoe_size_eu),
    style_tags: p?.style_tags ?? [],
    fabric_preferences: p?.fabric_preferences ?? [],
    budget_max_eur: p?.budget_max_eur ?? 150,
    style_notes: p?.style_notes ?? "",
  };
}

const strToNum = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
};

/** Convert a draft into a DB-shaped payload for upsert/update. */
export function draftToProfilePayload(d: ProfileDraft): Partial<ProfileRow> {
  return {
    name: d.name.trim() || null,
    gender: d.gender || null,
    age: strToNum(d.age),
    height_cm: strToNum(d.height_cm),
    weight_kg: strToNum(d.weight_kg),
    body_shape: d.body_shape || null,
    clothing_size_top: d.clothing_size_top || null,
    clothing_size_bottom: d.clothing_size_bottom || null,
    shoe_size_eu: strToNum(d.shoe_size_eu),
    style_tags: d.style_tags,
    fabric_preferences: d.fabric_preferences,
    budget_max_eur: d.budget_max_eur,
    style_notes: d.style_notes.trim() || null,
  };
}

/* ----------------------------- field widgets ----------------------------- */

/** A multi-select grid of pill/badge toggles. */
export function PillMultiSelect({
  options,
  value,
  onToggle,
}: {
  options: readonly string[];
  value: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option)}
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Badge
              variant={active ? "solid" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1 text-sm font-light transition-colors",
                active ? "" : "hover:border-ink",
              )}
            >
              {humanizeTag(option)}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

/** Visual selector for body shape using simple glyphs. */
export function BodyShapeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {BODY_SHAPES.map((shape) => {
        const active = value === shape.value;
        return (
          <button
            key={shape.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(shape.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-ink bg-accent"
                : "border-line bg-card hover:border-ink",
            )}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {shape.glyph}
            </span>
            <span className="text-xs font-light text-muted-foreground">
              {shape.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A labeled shadcn Select bound to a string value. */
export function SelectField({
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** A labeled numeric Input. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn("no-spinner", unit && "pr-12")}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-light text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
