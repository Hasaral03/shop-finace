"use server";

import { ok, fail, type ActionResult } from "@/lib/auth";
import type {
  DashboardSummary,
  Expense,
  FinancialTrend,
  Product,
  Sale,
} from "@/types/application";
import { caught, getActionContext, parseDateRange } from "./_shared";

type PaymentSummary = {
  payment_method: string;
  total_amount: number;
  payment_count: number;
};
type TopProduct = {
  product_id: string | null;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
};
type TopCustomer = {
  customer_id: string;
  name: string;
  total_spent: number;
  sales_count: number;
};
type DashboardData = {
  summary: DashboardSummary;
  trends: FinancialTrend[];
  paymentsByMethod: PaymentSummary[];
  topProducts: TopProduct[];
  recentSales: Sale[];
  recentExpenses: Expense[];
  lowStockProducts: Product[];
  topCustomers: TopCustomer[];
};

export async function getDashboardData(input: {
  startDate: string;
  endDate: string;
  previousStartDate?: string;
  previousEndDate?: string;
}): Promise<ActionResult<DashboardData>> {
  const auth = await getActionContext("canViewFullDashboard");
  if (!auth.success) return auth;
  const range = parseDateRange(input.startDate, input.endDate);
  if (!range) return fail("Invalid dashboard date range");
  const previous =
    input.previousStartDate && input.previousEndDate
      ? parseDateRange(input.previousStartDate, input.previousEndDate)
      : null;
  if ((input.previousStartDate || input.previousEndDate) && !previous) {
    return fail("Invalid comparison date range");
  }

  try {
    const [
      summaryResult,
      trendsResult,
      paymentsResult,
      productsResult,
      recentSalesResult,
      recentExpensesResult,
      inventoryResult,
      customerSalesResult,
    ] = await Promise.all([
      auth.data.supabase.rpc("get_dashboard_summary", {
        p_start_date: range.start,
        p_end_date: range.end,
        p_prev_start: previous?.start ?? null,
        p_prev_end: previous?.end ?? null,
      }),
      auth.data.supabase.rpc("get_financial_trends", {
        p_start_date: range.start,
        p_end_date: range.end,
      }),
      auth.data.supabase.rpc("get_sales_by_payment_method", {
        p_start_date: range.start,
        p_end_date: range.end,
      }),
      auth.data.supabase.rpc("get_top_products", {
        p_start_date: range.start,
        p_end_date: range.end,
        p_limit: 10,
        p_by: "quantity",
      }),
      auth.data.supabase
        .from("sales")
        .select("*, customers(*), profiles(*)")
        .eq("shop_id", auth.data.shopId)
        .order("sold_at", { ascending: false })
        .limit(10),
      auth.data.supabase
        .from("expenses")
        .select("*, expense_categories(*)")
        .eq("shop_id", auth.data.shopId)
        .order("expense_date", { ascending: false })
        .limit(10),
      auth.data.supabase
        .from("products")
        .select("*")
        .eq("shop_id", auth.data.shopId)
        .eq("is_active", true)
        .eq("track_inventory", true)
        .order("stock_quantity")
        .limit(500),
      auth.data.supabase
        .from("sales")
        .select("customer_id, total_amount, customers(name)")
        .eq("shop_id", auth.data.shopId)
        .eq("sale_status", "completed")
        .not("customer_id", "is", null)
        .gte("sold_at", range.start)
        .lt("sold_at", range.end)
        .limit(5000),
    ]);

    const firstError = [
      summaryResult.error,
      trendsResult.error,
      paymentsResult.error,
      productsResult.error,
      recentSalesResult.error,
      recentExpensesResult.error,
      inventoryResult.error,
      customerSalesResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    type CustomerSale = {
      customer_id: string | null;
      total_amount: number;
      customers: { name: string } | null;
    };
    const customerMap = new Map<string, TopCustomer>();
    for (const sale of (customerSalesResult.data ?? []) as unknown as CustomerSale[]) {
      if (!sale.customer_id) continue;
      const current = customerMap.get(sale.customer_id) ?? {
        customer_id: sale.customer_id,
        name: sale.customers?.name ?? "Unknown customer",
        total_spent: 0,
        sales_count: 0,
      };
      current.total_spent += Number(sale.total_amount);
      current.sales_count += 1;
      customerMap.set(sale.customer_id, current);
    }

    const lowStock = ((inventoryResult.data ?? []) as Product[])
      .filter((product) => product.stock_quantity <= product.minimum_stock)
      .slice(0, 10);

    return ok({
      summary: summaryResult.data as unknown as DashboardSummary,
      trends: (trendsResult.data ?? []) as unknown as FinancialTrend[],
      paymentsByMethod: (paymentsResult.data ?? []) as unknown as PaymentSummary[],
      topProducts: (productsResult.data ?? []) as unknown as TopProduct[],
      recentSales: (recentSalesResult.data ?? []) as unknown as Sale[],
      recentExpenses: (recentExpensesResult.data ?? []) as unknown as Expense[],
      lowStockProducts: lowStock,
      topCustomers: [...customerMap.values()]
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10),
    });
  } catch (error) {
    return caught(error, "Could not load dashboard");
  }
}
