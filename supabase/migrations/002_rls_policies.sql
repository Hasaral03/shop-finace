-- Row Level Security Policies

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- SHOPS
CREATE POLICY shops_select ON public.shops FOR SELECT
  USING (id = public.get_current_shop_id());
CREATE POLICY shops_update ON public.shops FOR UPDATE
  USING (id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));
CREATE POLICY shops_insert ON public.shops FOR INSERT
  WITH CHECK (true); -- bootstrapping; app restricts via service role / signup flow

-- PROFILES
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (shop_id = public.get_current_shop_id() OR id = auth.uid());
CREATE POLICY profiles_update_owner ON public.profiles FOR UPDATE
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner'])
  );
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR public.has_role(ARRAY['owner']));

-- CATEGORIES
CREATE POLICY categories_select ON public.categories FOR SELECT
  USING (shop_id = public.get_current_shop_id());
CREATE POLICY categories_insert ON public.categories FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY categories_update ON public.categories FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY categories_delete ON public.categories FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

-- PRODUCTS (cashiers can read but cost_price should be masked via view/app)
CREATE POLICY products_select ON public.products FOR SELECT
  USING (shop_id = public.get_current_shop_id());
CREATE POLICY products_insert ON public.products FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY products_update ON public.products FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY products_delete ON public.products FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

-- CUSTOMERS
CREATE POLICY customers_select ON public.customers FOR SELECT
  USING (shop_id = public.get_current_shop_id());
CREATE POLICY customers_insert ON public.customers FOR INSERT
  WITH CHECK (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
  );
CREATE POLICY customers_update ON public.customers FOR UPDATE
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
  );
CREATE POLICY customers_delete ON public.customers FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

-- SUPPLIERS
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'accountant'])
  );
CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

-- SALES
CREATE POLICY sales_select ON public.sales FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND (
      public.has_role(ARRAY['owner', 'manager', 'accountant'])
      OR (public.get_current_user_role() = 'cashier' AND sold_by = auth.uid())
    )
  );
CREATE POLICY sales_insert ON public.sales FOR INSERT
  WITH CHECK (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
  );
CREATE POLICY sales_update ON public.sales FOR UPDATE
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager'])
  );

-- SALE ITEMS
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id AND s.shop_id = public.get_current_shop_id()
    )
  );
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
        AND s.shop_id = public.get_current_shop_id()
        AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
    )
  );

-- PAYMENTS
CREATE POLICY payments_select ON public.payments FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'accountant', 'cashier'])
  );
CREATE POLICY payments_insert ON public.payments FOR INSERT
  WITH CHECK (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
  );

-- EXPENSE CATEGORIES
CREATE POLICY expense_categories_select ON public.expense_categories FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'accountant', 'manager'])
  );
CREATE POLICY expense_categories_insert ON public.expense_categories FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'accountant']));
CREATE POLICY expense_categories_update ON public.expense_categories FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'accountant']));
CREATE POLICY expense_categories_delete ON public.expense_categories FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));

-- EXPENSES
CREATE POLICY expenses_select ON public.expenses FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'accountant', 'manager'])
  );
CREATE POLICY expenses_insert ON public.expenses FOR INSERT
  WITH CHECK (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'accountant'])
  );
CREATE POLICY expenses_update ON public.expenses FOR UPDATE
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'accountant'])
  );
CREATE POLICY expenses_delete ON public.expenses FOR DELETE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'accountant']));

-- PURCHASES
CREATE POLICY purchases_select ON public.purchases FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'accountant'])
  );
CREATE POLICY purchases_insert ON public.purchases FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));
CREATE POLICY purchases_update ON public.purchases FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

-- PURCHASE ITEMS
CREATE POLICY purchase_items_select ON public.purchase_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.id = purchase_id AND p.shop_id = public.get_current_shop_id()
    )
  );
CREATE POLICY purchase_items_insert ON public.purchase_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.id = purchase_id
        AND p.shop_id = public.get_current_shop_id()
        AND public.has_role(ARRAY['owner', 'manager'])
    )
  );

-- STOCK MOVEMENTS
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT
  WITH CHECK (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'cashier'])
  );

-- REFUNDS
CREATE POLICY refunds_select ON public.refunds FOR SELECT
  USING (
    shop_id = public.get_current_shop_id()
    AND public.has_role(ARRAY['owner', 'manager', 'accountant'])
  );
CREATE POLICY refunds_insert ON public.refunds FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner', 'manager']));

CREATE POLICY refund_items_select ON public.refund_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.refunds r
      WHERE r.id = refund_id AND r.shop_id = public.get_current_shop_id()
    )
  );
CREATE POLICY refund_items_insert ON public.refund_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.refunds r
      WHERE r.id = refund_id
        AND r.shop_id = public.get_current_shop_id()
        AND public.has_role(ARRAY['owner', 'manager'])
    )
  );

-- AUDIT LOGS
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() OR shop_id IS NULL);

-- STAFF INVITATIONS
CREATE POLICY invitations_select ON public.staff_invitations FOR SELECT
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));
CREATE POLICY invitations_insert ON public.staff_invitations FOR INSERT
  WITH CHECK (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));
CREATE POLICY invitations_update ON public.staff_invitations FOR UPDATE
  USING (shop_id = public.get_current_shop_id() AND public.has_role(ARRAY['owner']));

-- Secure product view for cashiers (hides cost_price)
CREATE OR REPLACE VIEW public.products_pos
WITH (security_invoker = true)
AS
SELECT
  id, shop_id, category_id, name, description, sku, barcode,
  CASE
    WHEN public.get_current_user_role() IN ('owner', 'manager', 'accountant')
    THEN cost_price
    ELSE NULL
  END AS cost_price,
  selling_price, stock_quantity, minimum_stock, unit, image_url,
  track_inventory, is_active, created_at, updated_at
FROM public.products
WHERE shop_id = public.get_current_shop_id() AND is_active = true;

GRANT SELECT ON public.products_pos TO authenticated;
