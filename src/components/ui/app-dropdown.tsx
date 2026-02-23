"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AppDropdownOption = {
  value: string;
  label: ReactNode;
  searchText?: string;
  disabled?: boolean;
};

type AppDropdownProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: AppDropdownOption[];
  placeholder?: ReactNode;
  name?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  align?: "start" | "center" | "end";
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsLabel?: ReactNode;
};

const baseTriggerClass =
  "inline-flex h-11 w-full items-center justify-between rounded-xl border border-black/12 bg-white/95 px-3 text-sm text-[rgb(var(--navy))] shadow-[0_8px_18px_-16px_rgba(2,6,23,0.7)] outline-none transition hover:border-[rgb(var(--navy))]/28 focus-visible:border-[rgb(var(--navy))]/40 focus-visible:ring-2 focus-visible:ring-[rgb(var(--navy))]/15 disabled:cursor-not-allowed disabled:opacity-60";

const baseContentClass =
  "z-50 w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-black/10 bg-white/95 p-1 shadow-[0_16px_30px_-14px_rgba(15,23,42,0.45)] backdrop-blur";

const baseItemClass =
  "cursor-pointer rounded-lg px-3 py-2 text-sm text-[rgb(var(--navy))] data-[highlighted]:bg-[rgb(var(--navy))]/7 data-[highlighted]:text-[rgb(var(--navy))] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45";

export default function AppDropdown({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Selectionner",
  name,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  itemClassName,
  align = "start",
  searchable = false,
  searchPlaceholder = "Rechercher...",
  noResultsLabel = "Aucun resultat",
}: AppDropdownProps) {
  const fallbackValue = useMemo(
    () => defaultValue ?? value ?? options.find((option) => !option.disabled)?.value ?? "",
    [defaultValue, options, value]
  );

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => fallbackValue);
  const [searchQuery, setSearchQuery] = useState("");
  const hasCurrentInOptions = options.some((option) => option.value === internalValue);
  const currentValue = isControlled ? (value ?? "") : hasCurrentInOptions ? internalValue : fallbackValue;
  const selected = options.find((option) => option.value === currentValue);
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;

    return options.filter((option) => {
      const labelText = typeof option.label === "string" ? option.label : "";
      const haystack = `${option.searchText ?? ""} ${labelText} ${option.value}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, searchQuery, searchable]);

  function handleSelect(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={disabled} className={cn(baseTriggerClass, triggerClassName)}>
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronDown className="h-4 w-4 text-[rgb(var(--navy))]/55" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className={cn(baseContentClass, contentClassName)}>
          {searchable ? (
            <div className="px-1 pb-1">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-sm text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-black/50">{noResultsLabel}</div>
          ) : (
            filteredOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={disabled || option.disabled}
                className={cn(baseItemClass, itemClassName)}
                onSelect={(event) => {
                  if (disabled || option.disabled) {
                    event.preventDefault();
                    return;
                  }
                  handleSelect(option.value);
                }}
              >
                <span className="truncate">{option.label}</span>
                {currentValue === option.value ? (
                  <Check className="ml-auto h-4 w-4 text-[rgb(var(--navy))]" />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
    </div>
  );
}
