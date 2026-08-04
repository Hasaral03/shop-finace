import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";
import type { DateRange, DateRangePreset } from "@/types/application";

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "LKR",
  locale = "en-LK"
): string {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatNumber(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  });
}

export function formatPercent(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function formatDateTime(
  date: string | Date,
  timezone = "Asia/Colombo"
): string {
  return formatInTimeZone(new Date(date), timezone, "dd MMM yyyy, hh:mm a");
}

export function formatDate(
  date: string | Date,
  timezone = "Asia/Colombo"
): string {
  return formatInTimeZone(new Date(date), timezone, "dd MMM yyyy");
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function wallTimeInZone(base: Date, timezone: string, transform: (d: Date) => Date): Date {
  const zoned = toZonedTime(base, timezone);
  const local = transform(zoned);
  const asLocalString = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}T${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}:${String(local.getSeconds()).padStart(2, "0")}.${String(local.getMilliseconds()).padStart(3, "0")}`;
  return fromZonedTime(asLocalString, timezone);
}

export function getDateRange(
  preset: DateRangePreset,
  timezone = "Asia/Colombo",
  customStart?: Date,
  customEnd?: Date
): DateRange {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (preset) {
    case "today":
      start = wallTimeInZone(now, timezone, startOfDay);
      end = wallTimeInZone(now, timezone, endOfDay);
      break;
    case "yesterday":
      start = wallTimeInZone(now, timezone, (d) => startOfDay(subDays(d, 1)));
      end = wallTimeInZone(now, timezone, (d) => endOfDay(subDays(d, 1)));
      break;
    case "last_7_days":
      start = wallTimeInZone(now, timezone, (d) => startOfDay(subDays(d, 6)));
      end = wallTimeInZone(now, timezone, endOfDay);
      break;
    case "last_30_days":
      start = wallTimeInZone(now, timezone, (d) => startOfDay(subDays(d, 29)));
      end = wallTimeInZone(now, timezone, endOfDay);
      break;
    case "this_month":
      start = wallTimeInZone(now, timezone, startOfMonth);
      end = wallTimeInZone(now, timezone, endOfMonth);
      break;
    case "last_month":
      start = wallTimeInZone(now, timezone, (d) => startOfMonth(subMonths(d, 1)));
      end = wallTimeInZone(now, timezone, (d) => endOfMonth(subMonths(d, 1)));
      break;
    case "this_year":
      start = wallTimeInZone(now, timezone, startOfYear);
      end = wallTimeInZone(now, timezone, endOfYear);
      break;
    case "custom":
      start = customStart
        ? wallTimeInZone(customStart, timezone, startOfDay)
        : wallTimeInZone(now, timezone, startOfDay);
      end = customEnd
        ? wallTimeInZone(customEnd, timezone, endOfDay)
        : wallTimeInZone(now, timezone, endOfDay);
      break;
    default:
      start = wallTimeInZone(now, timezone, startOfDay);
      end = wallTimeInZone(now, timezone, endOfDay);
  }

  return { start, end, preset };
}

export function previousPeriod(range: DateRange): { start: Date; end: Date } {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    end: new Date(range.start.getTime()),
    start: new Date(range.start.getTime() - duration),
  };
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = cols.join(",");
  const body = rows
    .map((row) => cols.map((c) => escape(row[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}
