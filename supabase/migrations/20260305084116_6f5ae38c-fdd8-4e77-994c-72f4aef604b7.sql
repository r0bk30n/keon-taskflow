
-- Fix search_path on wf functions
CREATE OR REPLACE FUNCTION public.wf_update_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.wf_prevent_step_key_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.step_key IS DISTINCT FROM NEW.step_key THEN
    RAISE EXCEPTION 'step_key cannot be modified after creation (was: %, new: %)', OLD.step_key, NEW.step_key;
  END IF;
  RETURN NEW;
END;
$$;

-- Tighten runtime RLS: only accessible if user can access the demand
DROP POLICY IF EXISTS "wf_runtime_instances_all" ON public.wf_runtime_instances;
CREATE POLICY "wf_runtime_instances_insert" ON public.wf_runtime_instances FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR public.can_access_task(demand_id)
);
CREATE POLICY "wf_runtime_instances_update" ON public.wf_runtime_instances FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR public.can_access_task(demand_id)
);
