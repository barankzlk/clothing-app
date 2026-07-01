"use client";

import { Label } from "@/components/ui/label";
import { SEARCH_FILTER_GROUPS } from "@/lib/style-tags";
import { PillMultiSelect } from "@/components/profile-fields";

export function SearchFilters({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="space-y-5">
      {SEARCH_FILTER_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <Label className="text-muted-foreground">{group.label}</Label>
          <PillMultiSelect
            options={group.tags}
            value={selected}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  );
}
