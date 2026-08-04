-- Storage buckets for product images and expense receipts

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'expense-receipts',
    'expense-receipts',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- Product images: shop members can upload; public read
CREATE POLICY product_images_select ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY product_images_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND public.has_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY product_images_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND public.has_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY product_images_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.has_role(ARRAY['owner', 'manager'])
  );

-- Expense receipts: authenticated shop members with expense access
CREATE POLICY expense_receipts_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts'
    AND auth.role() = 'authenticated'
    AND public.has_role(ARRAY['owner', 'accountant', 'manager'])
  );

CREATE POLICY expense_receipts_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND auth.role() = 'authenticated'
    AND public.has_role(ARRAY['owner', 'accountant'])
  );
