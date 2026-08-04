"use server";

import { ok, fail, type ActionResult } from "@/lib/auth";
import type {
  Customer,
  Expense,
  Payment,
  Product,
  Sale,
  StockMovement,
  Supplier,
} from "@/types/application";
import { caught, getActionContext, parseDateRange } from "./_shared";

type DateFilters = { startDate: string; endDate: string };
type DailyAmount = { date: string; amount: number; count: number };
type ProfitRow = {
  date: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  salesCount: number;
};

async function reportContext(filters: DateFilters) {
  const auth = await getActionContext("canViewReports");
  if (!auth.success) return { auth, range: null };
  const range = parseDateRange(filters.startDate, filters.endDate);
  return { auth, range };
}

export async function getSalesReport(
  filters: DateFilters & {
    status?: string;
    paymentStatus?: string;
  }
): Promise<ActionResult<{ rows: Sale[]; total: number; count: number }>> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  let query = auth.data.supabase
    .from("sales")
    .select("*, customers(*), profiles(*)")
    .eq("shop_id", auth.data.shopId)
    .gte("sold_at", range.start)
    .lt("sold_at", range.end)
    .order("sold_at", { ascending: false })
    .limit(10000);
  if (filters.status) query = query.eq("sale_status", filters.status);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  const { data, error } = await query;
  if (error) return caught(error, "Could not load sales report");
  const rows = (data ?? []) as unknown as Sale[];
  return ok({
    rows,
    total: rows.reduce((sum, sale) => sum + Number(sale.total_amount), 0),
    count: rows.length,
  });
}

export async function getRevenueReport(
  filters: DateFilters
): Promise<ActionResult<{ daily: DailyAmount[]; totalRevenue: number; salesCount: number }>> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const { data, error } = await auth.data.supabase
      .from("sales")
      .select("sold_at, total_amount")
      .eq("shop_id", auth.data.shopId)
      .eq("sale_status", "completed")
      .gte("sold_at", range.start)
      .lt("sold_at", range.end)
      .order("sold_at")
      .limit(10000);
    if (error) throw error;
    const daily = new Map<string, DailyAmount>();
    for (const sale of data ?? []) {
      const date = String(sale.sold_at).slice(0, 10);
      const current = daily.get(date) ?? { date, amount: 0, count: 0 };
      current.amount += Number(sale.total_amount);
      current.count += 1;
      daily.set(date, current);
    }
    const rows = [...daily.values()];
    return ok({
      daily: rows,
      totalRevenue: rows.reduce((sum, row) => sum + row.amount, 0),
      salesCount: rows.reduce((sum, row) => sum + row.count, 0),
    });
  } catch (error) {
    return caught(error, "Could not load revenue report");
  }
}

export async function getProfitReport(
  filters: DateFilters
): Promise<
  ActionResult<{
    daily: ProfitRow[];
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  }>
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const [salesResult, expenseResult] = await Promise.all([
      auth.data.supabase
        .from("sales")
        .select("sold_at, total_amount, sale_items(quantity, unit_cost)")
        .eq("shop_id", auth.data.shopId)
        .eq("sale_status", "completed")
        .gte("sold_at", range.start)
        .lt("sold_at", range.end)
        .limit(10000),
      auth.data.supabase
        .from("expenses")
        .select("amount")
        .eq("shop_id", auth.data.shopId)
        .gte("expense_date", range.start.slice(0, 10))
        .lt("expense_date", range.end.slice(0, 10))
        .limit(10000),
    ]);
    if (salesResult.error) throw salesResult.error;
    if (expenseResult.error) throw expenseResult.error;
    type ProfitSale = {
      sold_at: string;
      total_amount: number;
      sale_items: { quantity: number; unit_cost: number }[];
    };
    const daily = new Map<string, ProfitRow>();
    for (const sale of (salesResult.data ?? []) as unknown as ProfitSale[]) {
      const date = sale.sold_at.slice(0, 10);
      const cogs = sale.sale_items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unit_cost),
        0
      );
      const current = daily.get(date) ?? {
        date,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        salesCount: 0,
      };
      current.revenue += Number(sale.total_amount);
      current.cogs += cogs;
      current.grossProfit = current.revenue - current.cogs;
      current.salesCount += 1;
      daily.set(date, current);
    }
    const rows = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const cogs = rows.reduce((sum, row) => sum + row.cogs, 0);
    const expenses = (expenseResult.data ?? []).reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    return ok({
      daily: rows,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      expenses,
      netProfit: revenue - cogs - expenses,
    });
  } catch (error) {
    return caught(error, "Could not load profit report");
  }
}

export async function getExpensesReport(
  filters: DateFilters
): Promise<
  ActionResult<{ rows: Expense[]; total: number; byCategory: Record<string, number> }>
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  const { data, error } = await auth.data.supabase
    .from("expenses")
    .select("*, expense_categories(*)")
    .eq("shop_id", auth.data.shopId)
    .gte("expense_date", range.start.slice(0, 10))
    .lt("expense_date", range.end.slice(0, 10))
    .order("expense_date", { ascending: false })
    .limit(10000);
  if (error) return caught(error, "Could not load expenses report");
  const rows = (data ?? []) as unknown as Expense[];
  const byCategory: Record<string, number> = {};
  for (const expense of rows) {
    const category = expense.expense_categories?.name ?? "Uncategorized";
    byCategory[category] = (byCategory[category] ?? 0) + Number(expense.amount);
  }
  return ok({
    rows,
    total: rows.reduce((sum, expense) => sum + Number(expense.amount), 0),
    byCategory,
  });
}

export async function getInventoryReport(
  filters: DateFilters
): Promise<
  ActionResult<{
    products: Product[];
    movements: StockMovement[];
    inventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const [productsResult, movementsResult] = await Promise.all([
      auth.data.supabase
        .from("products")
        .select("*")
        .eq("shop_id", auth.data.shopId)
        .eq("track_inventory", true)
        .order("name")
        .limit(10000),
      auth.data.supabase
        .from("stock_movements")
        .select("*, products(*)")
        .eq("shop_id", auth.data.shopId)
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (movementsResult.error) throw movementsResult.error;
    const products = (productsResult.data ?? []) as Product[];
    return ok({
      products,
      movements: (movementsResult.data ?? []) as unknown as StockMovement[],
      inventoryValue: products.reduce(
        (sum, product) => sum + Number(product.stock_quantity) * Number(product.cost_price),
        0
      ),
      lowStockCount: products.filter(
        (product) =>
          product.stock_quantity > 0 && product.stock_quantity <= product.minimum_stock
      ).length,
      outOfStockCount: products.filter((product) => product.stock_quantity <= 0).length,
    });
  } catch (error) {
    return caught(error, "Could not load inventory report");
  }
}

export async function getProductsReport(
  filters: DateFilters
): Promise<
  ActionResult<
    Array<{
      productId: string | null;
      name: string;
      sku: string | null;
      quantity: number;
      revenue: number;
      cogs: number;
      grossProfit: number;
    }>
  >
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const { data, error } = await auth.data.supabase
      .from("sale_items")
      .select(
        "product_id, product_name, product_sku, quantity, line_total, unit_cost, sales!inner(shop_id, sold_at, sale_status)"
      )
      .eq("sales.shop_id", auth.data.shopId)
      .eq("sales.sale_status", "completed")
      .gte("sales.sold_at", range.start)
      .lt("sales.sold_at", range.end)
      .limit(10000);
    if (error) throw error;
    type ProductSale = {
      product_id: string | null;
      product_name: string;
      product_sku: string | null;
      quantity: number;
      line_total: number;
      unit_cost: number;
    };
    const totals = new Map<
      string,
      {
        productId: string | null;
        name: string;
        sku: string | null;
        quantity: number;
        revenue: number;
        cogs: number;
        grossProfit: number;
      }
    >();
    for (const item of (data ?? []) as unknown as ProductSale[]) {
      const key = item.product_id ?? `${item.product_name}:${item.product_sku ?? ""}`;
      const current = totals.get(key) ?? {
        productId: item.product_id,
        name: item.product_name,
        sku: item.product_sku,
        quantity: 0,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
      };
      current.quantity += Number(item.quantity);
      current.revenue += Number(item.line_total);
      current.cogs += Number(item.quantity) * Number(item.unit_cost);
      current.grossProfit = current.revenue - current.cogs;
      totals.set(key, current);
    }
    return ok([...totals.values()].sort((a, b) => b.revenue - a.revenue));
  } catch (error) {
    return caught(error, "Could not load products report");
  }
}

export async function getPaymentsReport(
  filters: DateFilters
): Promise<
  ActionResult<{ rows: Payment[]; total: number; byMethod: Record<string, number> }>
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  const { data, error } = await auth.data.supabase
    .from("payments")
    .select("*")
    .eq("shop_id", auth.data.shopId)
    .gte("paid_at", range.start)
    .lt("paid_at", range.end)
    .order("paid_at", { ascending: false })
    .limit(10000);
  if (error) return caught(error, "Could not load payments report");
  const rows = (data ?? []) as unknown as Payment[];
  const byMethod: Record<string, number> = {};
  for (const payment of rows) {
    byMethod[payment.payment_method] =
      (byMethod[payment.payment_method] ?? 0) + Number(payment.amount);
  }
  return ok({
    rows,
    total: rows.reduce((sum, payment) => sum + Number(payment.amount), 0),
    byMethod,
  });
}

export async function getCustomersReport(
  filters: DateFilters
): Promise<
  ActionResult<
    Array<Customer & { periodSales: number; periodSpent: number }>
  >
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const [customersResult, salesResult] = await Promise.all([
      auth.data.supabase
        .from("customers")
        .select("*")
        .eq("shop_id", auth.data.shopId)
        .order("name")
        .limit(10000),
      auth.data.supabase
        .from("sales")
        .select("customer_id, total_amount")
        .eq("shop_id", auth.data.shopId)
        .eq("sale_status", "completed")
        .not("customer_id", "is", null)
        .gte("sold_at", range.start)
        .lt("sold_at", range.end)
        .limit(10000),
    ]);
    if (customersResult.error) throw customersResult.error;
    if (salesResult.error) throw salesResult.error;
    const totals = new Map<string, { count: number; spent: number }>();
    for (const sale of salesResult.data ?? []) {
      if (!sale.customer_id) continue;
      const current = totals.get(sale.customer_id) ?? { count: 0, spent: 0 };
      current.count += 1;
      current.spent += Number(sale.total_amount);
      totals.set(sale.customer_id, current);
    }
    return ok(
      ((customersResult.data ?? []) as Customer[]).map((customer) => ({
        ...customer,
        periodSales: totals.get(customer.id)?.count ?? 0,
        periodSpent: totals.get(customer.id)?.spent ?? 0,
      }))
    );
  } catch (error) {
    return caught(error, "Could not load customers report");
  }
}

export async function getSuppliersReport(
  filters: DateFilters
): Promise<
  ActionResult<
    Array<Supplier & { periodPurchases: number; periodPurchased: number }>
  >
> {
  const { auth, range } = await reportContext(filters);
  if (!auth.success) return auth;
  if (!range) return fail("Invalid report date range");
  try {
    const [suppliersResult, purchasesResult] = await Promise.all([
      auth.data.supabase
        .from("suppliers")
        .select("*")
        .eq("shop_id", auth.data.shopId)
        .order("name")
        .limit(10000),
      auth.data.supabase
        .from("purchases")
        .select("supplier_id, total_amount")
        .eq("shop_id", auth.data.shopId)
        .eq("purchase_status", "completed")
        .not("supplier_id", "is", null)
        .gte("purchased_at", range.start)
        .lt("purchased_at", range.end)
        .limit(10000),
    ]);
    if (suppliersResult.error) throw suppliersResult.error;
    if (purchasesResult.error) throw purchasesResult.error;
    type PurchaseTotal = { supplier_id: string | null; total_amount: number };
    const totals = new Map<string, { count: number; purchased: number }>();
    for (const purchase of (purchasesResult.data ?? []) as unknown as PurchaseTotal[]) {
      if (!purchase.supplier_id) continue;
      const current = totals.get(purchase.supplier_id) ?? { count: 0, purchased: 0 };
      current.count += 1;
      current.purchased += Number(purchase.total_amount);
      totals.set(purchase.supplier_id, current);
    }
    return ok(
      ((suppliersResult.data ?? []) as Supplier[]).map((supplier) => ({
        ...supplier,
        periodPurchases: totals.get(supplier.id)?.count ?? 0,
        periodPurchased: totals.get(supplier.id)?.purchased ?? 0,
      }))
    );
  } catch (error) {
    return caught(error, "Could not load suppliers report");
  }
}
