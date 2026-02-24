
-- Table de configuration des sorties vers tables cibles
-- Permet de mapper les champs d'un processus/sous-processus vers les colonnes d'une table
CREATE TABLE public.process_table_output_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_template_id UUID REFERENCES public.process_templates(id) ON DELETE CASCADE,
  sub_process_template_id UUID REFERENCES public.sub_process_templates(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'task_done',
  field_mappings JSONB NOT NULL DEFAULT '[]',
  static_mappings JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_template CHECK (
    process_template_id IS NOT NULL OR sub_process_template_id IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE public.process_table_output_mappings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage output mappings"
ON public.process_table_output_mappings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read (needed for task status service)
CREATE POLICY "Authenticated users can read output mappings"
ON public.process_table_output_mappings
FOR SELECT
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_process_table_output_mappings_updated_at
  BEFORE UPDATE ON public.process_table_output_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
