"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/types/application";

export interface CustomDateRange {
  start?: Date;
  end?: Date;
}

interface DateRangePickerProps {
  preset: DateRangePreset;
  onChange: (preset: DateRangePreset, dates?: CustomDateRange) => void;
  startDate?: Date;
  endDate?: Date;
  className?: string;
  disabled?: boolean;
}

const presets: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

function toInputDate(date?: Date) {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function fromInputDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function DateRangePicker({
  preset,
  onChange,
  startDate,
  endDate,
  className,
  disabled,
}: DateRangePickerProps) {
  const customDates: CustomDateRange = {
    start: startDate,
    end: endDate,
  };

  function handlePresetChange(value: DateRangePreset | null) {
    if (!value) return;
    onChange(value, value === "custom" ? customDates : undefined);
  }

  function updateCustomDate(key: keyof CustomDateRange, value: string) {
    const next = { ...customDates, [key]: fromInputDate(value) };
    onChange("custom", next);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={preset}
        onValueChange={handlePresetChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-44" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {presets.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" ? (
        <>
          <Input
            type="date"
            value={toInputDate(customDates.start)}
            max={toInputDate(customDates.end)}
            onChange={(event) => updateCustomDate("start", event.target.value)}
            disabled={disabled}
            aria-label="Start date"
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={toInputDate(customDates.end)}
            min={toInputDate(customDates.start)}
            onChange={(event) => updateCustomDate("end", event.target.value)}
            disabled={disabled}
            aria-label="End date"
            className="w-auto"
          />
        </>
      ) : null}
    </div>
  );
}
