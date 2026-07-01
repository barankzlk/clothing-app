"use client";

import { Label } from "@/components/ui/label";
import { getSearchFilterGroups } from "@/lib/style-tags";
import { PillMultiSelect } from "@/components/profile-fields";
import { useLocale } from "@/lib/i18n/locale-context";
import { tagLabel } from "@/lib/i18n/tag-labels";

/** Category color per filter group, per the bento redesign spec. */
const GROUP_COLOR: Record<string, string> = {
  groupAesthetic: "#C4956A", // caramel
  groupOccasion: "#8B6F47", // brown
  groupFabricFit: "#2C1A0E", // dark brown
  groupColors: "#C4956A", // caramel (not specified — reuses aesthetic's tone)
};

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
            color={GROUP_COLOR[group.key]}
          />
        </div>
      ))}
    </div>
  );
}
