"use client";

import type { ReactNode } from "react";
import { Download, Printer } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { DateRangePicker, type CustomDateRange } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, toCsv } from "@/lib/formatting";
import type { DateRangePreset } from "@/types/application";

export interface ReportTotal {
  label: string;
  value: string;
}

interface ReportShellProps {
  title: string;
  description: string;
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  totals: ReportTotal[];
  exportRows: Record<string, unknown>[];
  exportName: string;
  timezone: string;
  children: ReactNode;
}

function localDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function ReportShell({
  title,
  description,
  preset,
  startDate,
  endDate,
  totals,
  exportRows,
  exportName,
  timezone,
  children,
}: ReportShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  function changeRange(nextPreset: DateRangePreset, dates?: CustomDateRange) {
    const params = new URLSearchParams();
    params.set("preset", nextPreset);
    if (nextPreset === "custom" && dates?.start && dates.end) {
      params.set("start", localDate(dates.start));
      params.set("end", localDate(dates.end));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function downloadCsv() {
    const csv = toCsv(exportRows);
    if (!csv) {
      toast.info("There is no report data to export");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = `${exportName}-${localDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exported");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(startDate, timezone)} – {formatDate(endDate, timezone)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <DateRangePicker
            preset={preset}
            startDate={new Date(startDate)}
            endDate={new Date(endDate)}
            onChange={changeRange}
          />
          <Button variant="outline" onClick={downloadCsv}>
            <Download /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((total) => (
          <Card key={total.label}>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">{total.label}</p>
              <p className="mt-1 text-2xl font-semibold">{total.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {children}
    </div>
  );
}
