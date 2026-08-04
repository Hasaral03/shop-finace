import { z } from "zod";

const sriLankanPhone = z
  .string()
  .trim()
  .regex(/^(?:\+94|0)?7\d{8}$|^(?:\+94|0)?\d{9,10}$/, "Invalid phone number")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  stock_quantity: z.coerce.number().min(0).default(0),
  minimum_stock: z.coerce.number().min(0).default(0),
  unit: z.string().min(1).default("item"),
  track_inventory: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: sriLankanPhone,
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  credit_limit: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contact_person: z.string().optional(),
  phone: sriLankanPhone,
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const expenseSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  payment_method: z
    .enum(["cash", "card", "bank_transfer", "credit", "online_payment", "other"])
    .optional(),
  expense_date: z.string().min(1, "Date is required"),
});

export const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unit_price: z.coerce.number().min(0),
  discount_amount: z.coerce.number().min(0).default(0),
});

export const paymentSchema = z.object({
  payment_method: z.enum([
    "cash",
    "card",
    "bank_transfer",
    "credit",
    "online_payment",
    "other",
  ]),
  amount: z.coerce.number().positive(),
  reference_number: z.string().optional(),
});

export const createSaleSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Cart cannot be empty"),
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0),
});

export const createPurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  amount_paid: z.coerce.number().min(0).default(0),
  supplier_invoice_number: z.string().optional(),
  notes: z.string().optional(),
  update_cost: z.boolean().default(true),
});

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid(),
  quantity_change: z.coerce.number().refine((n) => n !== 0, "Quantity change required"),
  movement_type: z.enum([
    "opening_stock",
    "damaged",
    "expired",
    "adjustment",
    "transfer_in",
    "transfer_out",
  ]),
  note: z.string().optional(),
});

export const staffInviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["owner", "manager", "cashier", "accountant"]),
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
});

export const shopSettingsSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  tax_rate: z.coerce.number().min(0).max(100),
  receipt_footer: z.string().optional(),
  allow_negative_stock: z.boolean().default(false),
  business_registration_number: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StaffInviteInput = z.infer<typeof staffInviteSchema>;
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
