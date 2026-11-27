import { useId } from "react"
import { ChevronDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"

export type FilterGroupKey = "types" | "categories" | "areas"
export type FilterOption = { value: string; label: string; count: number }
export type FilterSelection = Record<FilterGroupKey, string[]>

type ProviderFiltersProps = {
  options: Record<FilterGroupKey, FilterOption[]>
  selected: FilterSelection
  onToggle: (group: FilterGroupKey, value: string) => void
  onClear: () => void
}

const GROUPS: { key: FilterGroupKey; title: string }[] = [
  { key: "types", title: "Provider type" },
  { key: "categories", title: "Category" },
  { key: "areas", title: "Area" },
]

export default function ProviderFilters({
  options,
  selected,
  onToggle,
  onClear,
}: ProviderFiltersProps) {
  const baseId = useId()
  const hasSelection = GROUPS.some(({ key }) => selected[key].length > 0)

  return (
    <Card className="self-start lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {GROUPS.map(({ key, title }) =>
          options[key].length === 0 ? null : (
            <Collapsible key={key} className="group border-b pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-sm py-1 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>{title}{selected[key].length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({selected[key].length} selected)</span>}</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <fieldset className="space-y-3 pt-3">
                  <legend className="sr-only">{title}</legend>
                  {options[key].map((option, index) => {
                    const id = `${baseId}-${key}-${index}`
                    return (
                      <div key={option.value} className="flex items-center gap-2.5">
                        <Checkbox
                          id={id}
                          checked={selected[key].includes(option.value)}
                          onCheckedChange={() => onToggle(key, option.value)}
                        />
                        <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                          {option.label}
                        </Label>
                        <span className="text-xs text-muted-foreground">{option.count}</span>
                      </div>
                    )
                  })}
                </fieldset>
              </CollapsibleContent>
            </Collapsible>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!hasSelection}
          onClick={onClear}
        >
          <X />
          Clear filters
        </Button>
      </CardContent>
    </Card>
  )
}