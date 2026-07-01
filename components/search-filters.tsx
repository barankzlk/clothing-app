"use client";

import { Label } from "@/components/ui/label";
import { getSearchFilterGroups } from "@/lib/style-tags";
import { PillMultiSelect } from "@/components/profile-fields";
import { useLocale } from "@/lib/i18n/locale-context";
import { tagLabel } from "@/lib/i18n/tag-labels";

export function SearchFilters({
  gender,
  selected,
  onToggle,
}: {
  gender: string | null;
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const { t, locale } = useLocale();
  const groups = getSearchFilterGroups(gender);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <Label className="text-muted-foreground">
            {t(`search.${group.key}`)}
          </Label>
          <PillMultiSelect
            options={group.tags}
            value={selected}
            onToggle={onToggle}
            labelFor={(tag) => tagLabel(tag, locale)}
          />
        </div>
      ))}
    </div>
  );
}
