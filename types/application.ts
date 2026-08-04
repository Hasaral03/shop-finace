export type UserRole = "owner" | "manager" | "cashier" | "accountant";

export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "credit"
  | "online_payment"
  | "other";

export type PaymentStatus = "paid" | "partially_paid" | "unpaid" | "refunded";
export type SaleStatus = "completed" | "pending" | "cancelled" | "refunded";
export type PurchaseStatus = "completed" | "pending" | "cancelled";

export type StockMovementType =
  | "opening_stock"
  | "purchase"
  | "sale"
  | "sale_return"
  | "purchase_return"
  | "damaged"
  | "expired"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

export interface Shop {
  id: string;
  name: string;
  business_registration_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  logo_url: string | null;
  tax_rate: number;
  receipt_footer: string | null;
  allow_negative_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  shop_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: string;
  image_url: string | null;
  track_inventory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number;
  current_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  customer_id: string | null;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  sale_status: SaleStatus;
  notes: string | null;
  sold_by: string;
  sold_at: string;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
  profiles?: Profile | null;
  sale_items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  shop_id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference_number: string | null;
  received_by: string;
  paid_at: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  payment_method: PaymentMethod | null;
  expense_date: string;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  expense_categories?: ExpenseCategory | null;
}

export interface Purchase {
  id: string;
  shop_id: string;
  supplier_id: string | null;
  purchase_number: string;
  supplier_invoice_number: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  purchase_status: PurchaseStatus;
  purchased_at: string;
  created_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier | null;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
  products?: Product | null;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  products?: Product | null;
}

export interface DashboardSummary {
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  sales_count: number;
  average_order_value: number;
  profit_margin: number;
  inventory_value: number;
  outstanding_credit: number;
  prev_revenue: number;
  prev_gross_profit: number;
  prev_expenses: number;
  prev_net_profit: number;
  prev_sales_count: number;
  prev_average_order_value: number;
}

export interface FinancialTrend {
  period_date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  sales_count: number;
}

export interface AuthUser {
  profile: Profile;
  shop: Shop | null;
}

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}
