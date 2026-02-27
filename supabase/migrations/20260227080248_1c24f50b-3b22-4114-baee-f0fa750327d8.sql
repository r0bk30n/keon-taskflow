
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert supplier attachments" ON public.supplier_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete supplier attachments" ON public.supplier_attachments;

-- Replace with proper policies using has_supplier_access()
CREATE POLICY "Supplier access users can insert attachments"
ON public.supplier_attachments FOR INSERT
TO authenticated
WITH CHECK (public.has_supplier_access());

CREATE POLICY "Supplier access users can delete attachments"
ON public.supplier_attachments FOR DELETE
TO authenticated
USING (public.has_supplier_access());
