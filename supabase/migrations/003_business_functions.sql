-- Secure business transaction functions and dashboard RPCs

-- ============================================================
-- CREATE SALE TRANSACTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_sale_transaction(
  p_customer_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_discount_amount numeric DEFAULT 0,
  p_tax_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_user_id uuid := auth.uid();
  v_role text;
  v_sale_id uuid;
  v_invoice text;
  v_item jsonb;
  v_payment jsonb;
  v_product record;
  v_shop record;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_amount_paid numeric(12,2) := 0;
  v_balance numeric(12,2);
  v_payment_status text;
  v_line_total numeric(12,2);
  v_qty numeric(12,3);
  v_unit_price numeric(12,2);
  v_line_discount numeric(12,2);
  v_credit_amount numeric(12,2) := 0;
  v_allow_negative boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT shop_id, role INTO v_shop_id, v_role
  FROM public.profiles WHERE id = v_user_id AND is_active = true;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'User has no shop assigned';
  END IF;

  IF v_role NOT IN ('owner', 'manager', 'cashier') THEN
    RAISE EXCEPTION 'Permission denied: cannot create sales';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  SELECT * INTO v_shop FROM public.shops WHERE id = v_shop_id;
  v_allow_negative := COALESCE(v_shop.allow_negative_stock, false);

  -- Validate items and compute subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_discount := COALESCE((v_item->>'discount_amount')::numeric, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND shop_id = v_shop_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product is inactive: %', v_product.name;
    END IF;

    IF v_product.track_inventory AND NOT v_allow_negative AND v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_line_total := ROUND((v_qty * v_unit_price) - v_line_discount, 2);
    IF v_line_total < 0 THEN
      RAISE EXCEPTION 'Line discount exceeds line total';
    END IF;
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  IF p_discount_amount < 0 OR p_discount_amount > v_subtotal THEN
    RAISE EXCEPTION 'Invalid overall discount';
  END IF;

  v_total := ROUND(v_subtotal - p_discount_amount + COALESCE(p_tax_amount, 0), 2);

  -- Sum payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    IF (v_payment->>'amount')::numeric <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be positive';
    END IF;
    v_amount_paid := v_amount_paid + (v_payment->>'amount')::numeric;
    IF (v_payment->>'payment_method') = 'credit' THEN
      v_credit_amount := v_credit_amount + (v_payment->>'amount')::numeric;
    END IF;
  END LOOP;

  -- For cash-only overpayment, clamp amount_paid to total for balance calc
  -- but allow change (amount_paid can exceed total for cash)
  v_balance := GREATEST(v_total - LEAST(v_amount_paid, v_total), 0);

  IF v_balance <= 0 THEN
    v_payment_status := 'paid';
    v_balance := 0;
  ELSIF v_amount_paid > 0 THEN
    v_payment_status := 'partially_paid';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  IF v_credit_amount > 0 AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer required for credit sales';
  END IF;

  v_invoice := public.generate_invoice_number(v_shop_id);

  INSERT INTO public.sales (
    shop_id, customer_id, invoice_number, subtotal, discount_amount, tax_amount,
    total_amount, amount_paid, balance_amount, payment_status, sale_status,
    notes, sold_by, sold_at
  ) VALUES (
    v_shop_id, p_customer_id, v_invoice, v_subtotal, p_discount_amount, COALESCE(p_tax_amount, 0),
    v_total, LEAST(v_amount_paid, v_total), v_balance, v_payment_status, 'completed',
    p_notes, v_user_id, now()
  ) RETURNING id INTO v_sale_id;

  -- Create items and reduce stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_discount := COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_line_total := ROUND((v_qty * v_unit_price) - v_line_discount, 2);

    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND shop_id = v_shop_id FOR UPDATE;

    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, product_sku, quantity,
      unit_price, unit_cost, discount_amount, tax_amount, line_total
    ) VALUES (
      v_sale_id, v_product.id, v_product.name, v_product.sku, v_qty,
      v_unit_price, v_product.cost_price, v_line_discount, 0, v_line_total
    );

    IF v_product.track_inventory THEN
      INSERT INTO public.stock_movements (
        shop_id, product_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, created_by
      ) VALUES (
        v_shop_id, v_product.id, 'sale', -v_qty,
        v_product.stock_quantity, v_product.stock_quantity - v_qty,
        'sale', v_sale_id, v_user_id
      );

      UPDATE public.products
      SET stock_quantity = stock_quantity - v_qty
      WHERE id = v_product.id;
    END IF;
  END LOOP;

  -- Create payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO public.payments (
      shop_id, sale_id, payment_method, amount, reference_number, received_by
    ) VALUES (
      v_shop_id, v_sale_id,
      v_payment->>'payment_method',
      (v_payment->>'amount')::numeric,
      v_payment->>'reference_number',
      v_user_id
    );
  END LOOP;

  -- Update customer balance for unpaid / credit portion
  IF p_customer_id IS NOT NULL AND v_balance > 0 THEN
    UPDATE public.customers
    SET current_balance = current_balance + v_balance
    WHERE id = p_customer_id AND shop_id = v_shop_id;
  END IF;

  INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  VALUES (v_shop_id, v_user_id, 'sale.created', 'sale', v_sale_id,
    jsonb_build_object('invoice_number', v_invoice, 'total', v_total));

  RETURN v_sale_id;
END;
$$;

-- ============================================================
-- CREATE PURCHASE TRANSACTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_purchase_transaction(
  p_supplier_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_discount_amount numeric DEFAULT 0,
  p_tax_amount numeric DEFAULT 0,
  p_amount_paid numeric DEFAULT 0,
  p_supplier_invoice_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_update_cost boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_user_id uuid := auth.uid();
  v_role text;
  v_purchase_id uuid;
  v_purchase_number text;
  v_item jsonb;
  v_product record;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_balance numeric(12,2);
  v_payment_status text;
  v_qty numeric(12,3);
  v_unit_cost numeric(12,2);
  v_line_total numeric(12,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT shop_id, role INTO v_shop_id, v_role
  FROM public.profiles WHERE id = v_user_id AND is_active = true;

  IF v_shop_id IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No purchase items';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    IF v_qty <= 0 OR v_unit_cost < 0 THEN
      RAISE EXCEPTION 'Invalid purchase item';
    END IF;
    v_subtotal := v_subtotal + ROUND(v_qty * v_unit_cost, 2);
  END LOOP;

  v_total := ROUND(v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_tax_amount, 0), 2);
  v_balance := GREATEST(v_total - COALESCE(p_amount_paid, 0), 0);

  IF v_balance <= 0 THEN
    v_payment_status := 'paid';
    v_balance := 0;
  ELSIF p_amount_paid > 0 THEN
    v_payment_status := 'partially_paid';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  v_purchase_number := public.generate_purchase_number(v_shop_id);

  INSERT INTO public.purchases (
    shop_id, supplier_id, purchase_number, supplier_invoice_number,
    subtotal, discount_amount, tax_amount, total_amount, amount_paid,
    balance_amount, payment_status, purchase_status, created_by, notes
  ) VALUES (
    v_shop_id, p_supplier_id, v_purchase_number, p_supplier_invoice_number,
    v_subtotal, COALESCE(p_discount_amount, 0), COALESCE(p_tax_amount, 0),
    v_total, COALESCE(p_amount_paid, 0), v_balance, v_payment_status,
    'completed', v_user_id, p_notes
  ) RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line_total := ROUND(v_qty * v_unit_cost, 2);

    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND shop_id = v_shop_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_cost, line_total)
    VALUES (v_purchase_id, v_product.id, v_qty, v_unit_cost, v_line_total);

    INSERT INTO public.stock_movements (
      shop_id, product_id, movement_type, quantity_change,
      quantity_before, quantity_after, reference_type, reference_id, created_by
    ) VALUES (
      v_shop_id, v_product.id, 'purchase', v_qty,
      v_product.stock_quantity, v_product.stock_quantity + v_qty,
      'purchase', v_purchase_id, v_user_id
    );

    UPDATE public.products
    SET
      stock_quantity = stock_quantity + v_qty,
      cost_price = CASE WHEN p_update_cost THEN v_unit_cost ELSE cost_price END
    WHERE id = v_product.id;
  END LOOP;

  IF p_supplier_id IS NOT NULL AND v_balance > 0 THEN
    UPDATE public.suppliers
    SET current_balance = current_balance + v_balance
    WHERE id = p_supplier_id AND shop_id = v_shop_id;
  END IF;

  INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  VALUES (v_shop_id, v_user_id, 'purchase.created', 'purchase', v_purchase_id,
    jsonb_build_object('purchase_number', v_purchase_number, 'total', v_total));

  RETURN v_purchase_id;
END;
$$;

-- ============================================================
-- STOCK ADJUSTMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id uuid,
  p_quantity_change numeric,
  p_movement_type text,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_user_id uuid := auth.uid();
  v_role text;
  v_product record;
  v_movement_id uuid;
  v_new_qty numeric(12,3);
BEGIN
  SELECT shop_id, role INTO v_shop_id, v_role
  FROM public.profiles WHERE id = v_user_id AND is_active = true;

  IF v_shop_id IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_movement_type NOT IN ('opening_stock', 'damaged', 'expired', 'adjustment', 'transfer_in', 'transfer_out') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;

  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND shop_id = v_shop_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  v_new_qty := v_product.stock_quantity + p_quantity_change;
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go negative';
  END IF;

  INSERT INTO public.stock_movements (
    shop_id, product_id, movement_type, quantity_change,
    quantity_before, quantity_after, note, created_by
  ) VALUES (
    v_shop_id, p_product_id, p_movement_type, p_quantity_change,
    v_product.stock_quantity, v_new_qty, p_note, v_user_id
  ) RETURNING id INTO v_movement_id;

  UPDATE public.products SET stock_quantity = v_new_qty WHERE id = p_product_id;
  RETURN v_movement_id;
END;
$$;

-- ============================================================
-- CANCEL SALE
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_user_id uuid := auth.uid();
  v_role text;
  v_sale record;
  v_item record;
  v_product record;
BEGIN
  SELECT shop_id, role INTO v_shop_id, v_role
  FROM public.profiles WHERE id = v_user_id AND is_active = true;

  IF v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_sale FROM public.sales
  WHERE id = p_sale_id AND shop_id = v_shop_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  IF v_sale.sale_status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed sales can be cancelled';
  END IF;

  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
      IF FOUND AND v_product.track_inventory THEN
        INSERT INTO public.stock_movements (
          shop_id, product_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id, note, created_by
        ) VALUES (
          v_shop_id, v_item.product_id, 'sale_return', v_item.quantity,
          v_product.stock_quantity, v_product.stock_quantity + v_item.quantity,
          'sale', p_sale_id, COALESCE(p_reason, 'Sale cancelled'), v_user_id
        );
        UPDATE public.products SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.product_id;
      END IF;
    END IF;
  END LOOP;

  IF v_sale.customer_id IS NOT NULL AND v_sale.balance_amount > 0 THEN
    UPDATE public.customers
    SET current_balance = GREATEST(current_balance - v_sale.balance_amount, 0)
    WHERE id = v_sale.customer_id;
  END IF;

  UPDATE public.sales
  SET sale_status = 'cancelled', payment_status = 'refunded', updated_at = now()
  WHERE id = p_sale_id;

  INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  VALUES (v_shop_id, v_user_id, 'sale.cancelled', 'sale', p_sale_id,
    jsonb_build_object('reason', p_reason));

  RETURN true;
END;
$$;

-- ============================================================
-- DASHBOARD SUMMARY RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_prev_start timestamptz DEFAULT NULL,
  p_prev_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid := public.get_current_shop_id();
  v_role text := public.get_current_user_role();
  v_result jsonb;
  v_revenue numeric(12,2);
  v_cogs numeric(12,2);
  v_expenses numeric(12,2);
  v_sales_count integer;
  v_prev_revenue numeric(12,2) := 0;
  v_prev_cogs numeric(12,2) := 0;
  v_prev_expenses numeric(12,2) := 0;
  v_prev_sales_count integer := 0;
  v_inventory_value numeric(12,2);
  v_outstanding_credit numeric(12,2);
BEGIN
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_role = 'cashier' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COUNT(*)
  INTO v_revenue, v_sales_count
  FROM public.sales s
  WHERE s.shop_id = v_shop_id
    AND s.sale_status = 'completed'
    AND s.sold_at >= p_start_date
    AND s.sold_at < p_end_date;

  SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0)
  INTO v_cogs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.shop_id = v_shop_id
    AND s.sale_status = 'completed'
    AND s.sold_at >= p_start_date
    AND s.sold_at < p_end_date;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_expenses
  FROM public.expenses e
  WHERE e.shop_id = v_shop_id
    AND e.expense_date >= p_start_date::date
    AND e.expense_date < p_end_date::date;

  IF p_prev_start IS NOT NULL AND p_prev_end IS NOT NULL THEN
    SELECT COALESCE(SUM(s.total_amount), 0), COUNT(*)
    INTO v_prev_revenue, v_prev_sales_count
    FROM public.sales s
    WHERE s.shop_id = v_shop_id AND s.sale_status = 'completed'
      AND s.sold_at >= p_prev_start AND s.sold_at < p_prev_end;

    SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0)
    INTO v_prev_cogs
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    WHERE s.shop_id = v_shop_id AND s.sale_status = 'completed'
      AND s.sold_at >= p_prev_start AND s.sold_at < p_prev_end;

    SELECT COALESCE(SUM(e.amount), 0)
    INTO v_prev_expenses
    FROM public.expenses e
    WHERE e.shop_id = v_shop_id
      AND e.expense_date >= p_prev_start::date
      AND e.expense_date < p_prev_end::date;
  END IF;

  SELECT COALESCE(SUM(stock_quantity * cost_price), 0)
  INTO v_inventory_value
  FROM public.products
  WHERE shop_id = v_shop_id AND is_active = true AND track_inventory = true;

  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_outstanding_credit
  FROM public.customers
  WHERE shop_id = v_shop_id AND current_balance > 0;

  v_result := jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'expenses', v_expenses,
    'net_profit', (v_revenue - v_cogs) - v_expenses,
    'sales_count', v_sales_count,
    'average_order_value', CASE WHEN v_sales_count > 0 THEN ROUND(v_revenue / v_sales_count, 2) ELSE 0 END,
    'profit_margin', CASE WHEN v_revenue > 0 THEN ROUND(((v_revenue - v_cogs) / v_revenue) * 100, 2) ELSE 0 END,
    'inventory_value', v_inventory_value,
    'outstanding_credit', v_outstanding_credit,
    'prev_revenue', v_prev_revenue,
    'prev_gross_profit', v_prev_revenue - v_prev_cogs,
    'prev_expenses', v_prev_expenses,
    'prev_net_profit', (v_prev_revenue - v_prev_cogs) - v_prev_expenses,
    'prev_sales_count', v_prev_sales_count,
    'prev_average_order_value', CASE WHEN v_prev_sales_count > 0 THEN ROUND(v_prev_revenue / v_prev_sales_count, 2) ELSE 0 END
  );

  RETURN v_result;
END;
$$;

-- Revenue / profit / expense trends by day
CREATE OR REPLACE FUNCTION public.get_financial_trends(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  period_date date,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  expenses numeric,
  net_profit numeric,
  sales_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid := public.get_current_shop_id();
BEGIN
  IF v_shop_id IS NULL OR public.get_current_user_role() = 'cashier' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(p_start_date::date, (p_end_date - interval '1 day')::date, '1 day'::interval)::date AS d
  ),
  sales_agg AS (
    SELECT
      (s.sold_at AT TIME ZONE COALESCE((SELECT timezone FROM shops WHERE id = v_shop_id), 'Asia/Colombo'))::date AS d,
      SUM(s.total_amount) AS revenue,
      COUNT(*) AS sales_count
    FROM sales s
    WHERE s.shop_id = v_shop_id AND s.sale_status = 'completed'
      AND s.sold_at >= p_start_date AND s.sold_at < p_end_date
    GROUP BY 1
  ),
  cogs_agg AS (
    SELECT
      (s.sold_at AT TIME ZONE COALESCE((SELECT timezone FROM shops WHERE id = v_shop_id), 'Asia/Colombo'))::date AS d,
      SUM(si.unit_cost * si.quantity) AS cogs
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.shop_id = v_shop_id AND s.sale_status = 'completed'
      AND s.sold_at >= p_start_date AND s.sold_at < p_end_date
    GROUP BY 1
  ),
  exp_agg AS (
    SELECT e.expense_date AS d, SUM(e.amount) AS expenses
    FROM expenses e
    WHERE e.shop_id = v_shop_id
      AND e.expense_date >= p_start_date::date
      AND e.expense_date < p_end_date::date
    GROUP BY 1
  )
  SELECT
    days.d,
    COALESCE(sales_agg.revenue, 0),
    COALESCE(cogs_agg.cogs, 0),
    COALESCE(sales_agg.revenue, 0) - COALESCE(cogs_agg.cogs, 0),
    COALESCE(exp_agg.expenses, 0),
    (COALESCE(sales_agg.revenue, 0) - COALESCE(cogs_agg.cogs, 0)) - COALESCE(exp_agg.expenses, 0),
    COALESCE(sales_agg.sales_count, 0)
  FROM days
  LEFT JOIN sales_agg ON sales_agg.d = days.d
  LEFT JOIN cogs_agg ON cogs_agg.d = days.d
  LEFT JOIN exp_agg ON exp_agg.d = days.d
  ORDER BY days.d;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_by_payment_method(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (payment_method text, total_amount numeric, payment_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid := public.get_current_shop_id();
BEGIN
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Permission denied'; END IF;

  RETURN QUERY
  SELECT p.payment_method, SUM(p.amount), COUNT(*)
  FROM payments p
  JOIN sales s ON s.id = p.sale_id
  WHERE p.shop_id = v_shop_id
    AND s.sale_status = 'completed'
    AND p.paid_at >= p_start_date AND p.paid_at < p_end_date
  GROUP BY p.payment_method
  ORDER BY SUM(p.amount) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_products(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_limit integer DEFAULT 10,
  p_by text DEFAULT 'quantity'
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  total_quantity numeric,
  total_revenue numeric,
  total_profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid := public.get_current_shop_id();
BEGIN
  IF v_shop_id IS NULL OR public.get_current_user_role() = 'cashier' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    si.product_id,
    si.product_name,
    SUM(si.quantity) AS total_quantity,
    SUM(si.line_total) AS total_revenue,
    SUM(si.line_total - (si.unit_cost * si.quantity)) AS total_profit
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.shop_id = v_shop_id AND s.sale_status = 'completed'
    AND s.sold_at >= p_start_date AND s.sold_at < p_end_date
  GROUP BY si.product_id, si.product_name
  ORDER BY
    CASE WHEN p_by = 'profit' THEN SUM(si.line_total - (si.unit_cost * si.quantity)) ELSE SUM(si.quantity) END DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_by_payment_method TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_shop_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role TO authenticated;
