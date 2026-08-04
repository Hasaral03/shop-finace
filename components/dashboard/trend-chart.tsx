"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TrendChartData {
  period_date: string;
  revenue: number;
  gross_profit: number;
  expenses: number;
  [key: string]: string | number;
}

interface TrendChartProps {
  data: TrendChartData[];
  type?: "line" | "area";
  title?: string;
  description?: string;
  className?: string;
}

const series = [
  { key: "revenue", label: "Revenue", color: "var(--chart-1)" },
  { key: "gross_profit", label: "Profit", color: "var(--success)" },
  { key: "expenses", label: "Expenses", color: "var(--danger)" },
] as const;

export function TrendChart({
  data,
  type = "area",
  title = "Financial trend",
  description,
  className,
}: TrendChartProps) {
  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="period_date" tickLine={false} axisLine={false} />
      <YAxis tickLine={false} axisLine={false} width={64} />
      <Tooltip />
      <Legend />
    </>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <div className={cn("h-72 w-full")}>
            <ResponsiveContainer width="100%" height="100%">
              {type === "line" ? (
                <LineChart data={data} margin={{ left: 4, right: 12 }}>
                  {shared}
                  {series.map((item) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.label}
                      stroke={item.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={data} margin={{ left: 4, right: 12 }}>
                  {shared}
                  {series.map((item) => (
                    <Area
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.label}
                      stroke={item.color}
                      fill={item.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
