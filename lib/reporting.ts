import { getDateRange } from "@/lib/formatting";
import type { DateRangePreset } from "@/types/application";

export type ReportSearchParams = Promise<{
  preset?: string;
  start?: string;
  end?: string;
}>;

const presets = new Set<DateRangePreset>([
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "this_year",
  "custom",
]);

function dateValue(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function resolveReportRange(
  searchParams: ReportSearchParams,
  timezone: string
) {
  const params = await searchParams;
  const requestedPreset = presets.has(params.preset as DateRangePreset)
    ? (params.preset as DateRangePreset)
    : "this_month";
  const customStart = dateValue(params.start);
  const customEnd = dateValue(params.end);
  const preset =
    requestedPreset === "custom" && (!customStart || !customEnd)
      ? "this_month"
      : requestedPreset;
  const range = getDateRange(preset, timezone, customStart, customEnd);
  return {
    preset,
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString(),
  };
}

export function reportError(result: { success: false; error: string }): never {
  throw new Error(result.error);
}
