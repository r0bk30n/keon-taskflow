
-- Add site_web column to supplier_purchase_enrichment
ALTER TABLE public.supplier_purchase_enrichment 
ADD COLUMN IF NOT EXISTS site_web TEXT DEFAULT NULL;

-- Create supplier-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-attachments', 'supplier-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for supplier-attachments bucket
CREATE POLICY "Authenticated users can upload supplier attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'supplier-attachments');

CREATE POLICY "Authenticated users can view supplier attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'supplier-attachments');

CREATE POLICY "Authenticated users can delete supplier attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-attachments');

-- Create supplier_attachments table to track files per supplier
CREATE TABLE IF NOT EXISTS public.supplier_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.supplier_purchase_enrichment(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS on supplier_attachments
ALTER TABLE public.supplier_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier attachments"
ON public.supplier_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert supplier attachments"
ON public.supplier_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete supplier attachments"
ON public.supplier_attachments FOR DELETE
TO authenticated
USING (true);
