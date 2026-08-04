"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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

export interface TopProductChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface TopProductsChartProps {
  data: TopProductChartData[];
  dataKey?: string;
  valueLabel?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function TopProductsChart({
  data,
  dataKey = "value",
  valueLabel = "Sales",
  title = "Top products",
  description,
  className,
}: TopProductsChartProps) {
  const chartHeight = Math.max(288, data.length * 44);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No product data available
          </div>
        ) : (
          <div className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 8, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={112}
                />
                <Tooltip />
                <Bar
                  dataKey={dataKey}
                  name={valueLabel}
                  fill="var(--chart-1)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
