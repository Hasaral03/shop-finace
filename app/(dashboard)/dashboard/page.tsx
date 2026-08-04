import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/actions/dashboard";
import { requireRouteAccess } from "@/lib/auth";
import { getDateRange, previousPeriod } from "@/lib/formatting";
import type { DateRangePreset } from "@/types/application";

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

type DashboardPageProps = {
  searchParams: Promise<{
    preset?: string;
    start?: string;
    end?: string;
  }>;
};

function validDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { shop } = await requireRouteAccess("/dashboard");
  const params = await searchParams;
  const preset = presets.has(params.preset as DateRangePreset)
    ? (params.preset as DateRangePreset)
    : "today";
  const start = validDate(params.start);
  const end = validDate(params.end);
  const effectivePreset = preset === "custom" && (!start || !end) ? "today" : preset;
  const range = getDateRange(effectivePreset, shop?.timezone, start, end);
  const comparison = previousPeriod(range);
  const result = await getDashboardData({
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString(),
    previousStartDate: comparison.start.toISOString(),
    previousEndDate: comparison.end.toISOString(),
  });

  return (
    <DashboardView
      data={result.success ? result.data : null}
      error={result.success ? null : result.error}
      preset={effectivePreset}
      startDate={range.start.toISOString()}
      endDate={range.end.toISOString()}
      currency={shop?.currency ?? "LKR"}
      timezone={shop?.timezone ?? "Asia/Colombo"}
    />
  );
}
