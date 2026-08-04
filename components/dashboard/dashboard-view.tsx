"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  BanknoteArrowDown,
  Boxes,
  CircleDollarSign,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingCart,
  TriangleAlert,
  Users,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDateTime, percentChange } from "@/lib/formatting";
import type {
  DashboardSummary,
  DateRangePreset,
  Expense,
  FinancialTrend,
  Product,
  Sale,
} from "@/types/application";

export type DashboardData = {
  summary: DashboardSummary;
  trends: FinancialTrend[];
  paymentsByMethod: Array<{
    payment_method: string;
    total_amount: number;
    payment_count: number;
  }>;
  topProducts: Array<{
    product_id: string | null;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
    total_profit: number;
  }>;
  recentSales: Sale[];
  recentExpenses: Expense[];
  lowStockProducts: Product[];
  topCustomers: Array<{
    customer_id: string;
    name: string;
    total_spent: number;
    sales_count: number;
  }>;
};

type DashboardViewProps = {
  data: DashboardData | null;
  error: string | null;
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  currency: string;
  timezone: string;
};

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Widget({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: typeof ShoppingCart;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {empty ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing to show
          </p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  data,
  error,
  preset,
  startDate,
  endDate,
  currency,
  timezone,
}: DashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function updateRange(nextPreset: DateRangePreset, dates?: { start?: Date; end?: Date }) {
    const params = new URLSearchParams();
    params.set("preset", nextPreset);
    if (nextPreset === "custom" && dates?.start && dates.end) {
      params.set("start", inputDate(dates.start));
      params.set("end", inputDate(dates.end));
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your shop performance at a glance." />
        <EmptyState
          icon={TriangleAlert}
          title="Dashboard could not be loaded"
          description={error ?? "Try refreshing the page."}
        />
      </div>
    );
  }

  const { summary } = data;
  const money = (value: number) => formatCurrency(value, currency);
  const unpaidSales = data.recentSales.filter((sale) => Number(sale.balance_amount) > 0);
  const outOfStock = data.lowStockProducts.filter(
    (product) => Number(product.stock_quantity) <= 0
  );
  const lowStock = data.lowStockProducts.filter(
    (product) => Number(product.stock_quantity) > 0
  );
  const paymentNames: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank transfer",
    credit: "Credit",
    online_payment: "Online payment",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Track revenue, profit, inventory, and customer activity."
        actions={
          <DateRangePicker
            preset={preset}
            startDate={new Date(startDate)}
            endDate={new Date(endDate)}
            onChange={updateRange}
            disabled={pending}
          />
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value={money(summary.revenue)} icon={CircleDollarSign} percentChange={percentChange(summary.revenue, summary.prev_revenue)} />
        <MetricCard label="Gross profit" value={money(summary.gross_profit)} icon={BadgeDollarSign} percentChange={percentChange(summary.gross_profit, summary.prev_gross_profit)} />
        <MetricCard label="Expenses" value={money(summary.expenses)} icon={BanknoteArrowDown} percentChange={percentChange(summary.expenses, summary.prev_expenses)} />
        <MetricCard label="Net profit" value={money(summary.net_profit)} icon={ReceiptText} percentChange={percentChange(summary.net_profit, summary.prev_net_profit)} />
        <MetricCard label="Sales" value={Number(summary.sales_count).toLocaleString()} icon={ShoppingCart} percentChange={percentChange(summary.sales_count, summary.prev_sales_count)} />
        <MetricCard label="Average order value" value={money(summary.average_order_value)} icon={CreditCard} percentChange={percentChange(summary.average_order_value, summary.prev_average_order_value)} />
        <MetricCard label="Inventory value" value={money(summary.inventory_value)} icon={Boxes} />
        <MetricCard label="Outstanding credit" value={money(summary.outstanding_credit)} icon={TriangleAlert} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <TrendChart
          className="xl:col-span-2"
          data={data.trends.map((item) => ({
            period_date: item.period_date,
            revenue: Number(item.revenue),
            gross_profit: Number(item.gross_profit),
            expenses: Number(item.expenses),
          }))}
          description="Revenue, gross profit, and expenses in the selected period."
        />
        <PaymentMethodChart
          data={data.paymentsByMethod.map((item) => ({
            name: paymentNames[item.payment_method] ?? item.payment_method,
            value: Number(item.total_amount),
          }))}
          description="Collected amount by payment type."
        />
      </section>

      <TopProductsChart
        data={data.topProducts.map((item) => ({
          name: item.product_name,
          value: Number(item.total_quantity),
          revenue: Number(item.total_revenue),
        }))}
        valueLabel="Units sold"
        description="Best-selling products by quantity."
      />

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Widget title="Recent sales" icon={ShoppingCart} empty={!data.recentSales.length}>
          {data.recentSales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{sale.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  {sale.customers?.name ?? "Walk-in customer"} · {formatDateTime(sale.sold_at, timezone)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium tabular-nums">{money(sale.total_amount)}</p>
                <StatusBadge status={sale.payment_status} />
              </div>
            </div>
          ))}
        </Widget>

        <Widget title="Recent expenses" icon={BanknoteArrowDown} empty={!data.recentExpenses.length}>
          {data.recentExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {expense.expense_categories?.name ?? "Uncategorized"} · {formatDateTime(expense.expense_date, timezone)}
                </p>
              </div>
              <p className="font-medium tabular-nums text-danger">{money(expense.amount)}</p>
            </div>
          ))}
        </Widget>

        <Widget title="Low stock" icon={Package} empty={!lowStock.length}>
          {lowStock.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
              </div>
              <StatusBadge status="low_stock" label={`${product.stock_quantity} ${product.unit}`} />
            </div>
          ))}
        </Widget>

        <Widget title="Out of stock" icon={TriangleAlert} empty={!outOfStock.length}>
          {outOfStock.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
              </div>
              <StatusBadge status="out_of_stock" />
            </div>
          ))}
        </Widget>

        <Widget title="Top customers" icon={Users} empty={!data.topCustomers.length}>
          {data.topCustomers.map((customer, index) => (
            <div key={customer.customer_id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{index + 1}. {customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.sales_count} sales</p>
              </div>
              <p className="font-medium tabular-nums">{money(customer.total_spent)}</p>
            </div>
          ))}
        </Widget>

        <Widget title="Unpaid balances" icon={CreditCard} empty={!unpaidSales.length}>
          {unpaidSales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{sale.customers?.name ?? sale.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{sale.invoice_number}</p>
              </div>
              <p className="font-medium tabular-nums text-danger">{money(sale.balance_amount)}</p>
            </div>
          ))}
        </Widget>
      </section>
    </div>
  );
}
