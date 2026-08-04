export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          business_registration_number?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          currency?: string;
          timezone?: string;
          logo_url?: string | null;
          tax_rate?: number;
          receipt_footer?: string | null;
          allow_negative_stock?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          shop_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          role: "owner" | "manager" | "cashier" | "accountant";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          shop_id?: string | null;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          role: "owner" | "manager" | "cashier" | "accountant";
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
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
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          sku?: string | null;
          barcode?: string | null;
          cost_price?: number;
          selling_price: number;
          stock_quantity?: number;
          minimum_stock?: number;
          unit?: string;
          image_url?: string | null;
          track_inventory?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      customers: {
        Row: {
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
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          credit_limit?: number;
          current_balance?: number;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
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
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          current_balance?: number;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      sales: {
        Row: {
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
          payment_status: string;
          sale_status: string;
          notes: string | null;
          sold_by: string;
          sold_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sale_items: {
        Row: {
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
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          shop_id: string;
          sale_id: string;
          payment_method: string;
          amount: number;
          reference_number: string | null;
          received_by: string;
          paid_at: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string | null;
          amount: number;
          description: string;
          payment_method: string | null;
          expense_date: string;
          receipt_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      purchases: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      purchase_items: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      stock_movements: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      refunds: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      refund_items: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      audit_logs: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_invitations: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      products_pos: {
        Row: Database["public"]["Tables"]["products"]["Row"] & {
          cost_price: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_sale_transaction: {
        Args: {
          p_customer_id?: string | null;
          p_items: Json;
          p_payments: Json;
          p_discount_amount?: number;
          p_tax_amount?: number;
          p_notes?: string | null;
        };
        Returns: string;
      };
      create_purchase_transaction: {
        Args: {
          p_supplier_id?: string | null;
          p_items: Json;
          p_discount_amount?: number;
          p_tax_amount?: number;
          p_amount_paid?: number;
          p_supplier_invoice_number?: string | null;
          p_notes?: string | null;
          p_update_cost?: boolean;
        };
        Returns: string;
      };
      get_dashboard_summary: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_prev_start?: string | null;
          p_prev_end?: string | null;
        };
        Returns: Json;
      };
      get_financial_trends: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: Json[];
      };
      get_sales_by_payment_method: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: Json[];
      };
      get_top_products: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_limit?: number;
          p_by?: string;
        };
        Returns: Json[];
      };
      adjust_stock: {
        Args: {
          p_product_id: string;
          p_quantity_change: number;
          p_movement_type: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      cancel_sale: {
        Args: { p_sale_id: string; p_reason?: string | null };
        Returns: boolean;
      };
      get_current_shop_id: { Args: Record<string, never>; Returns: string };
      get_current_user_role: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
