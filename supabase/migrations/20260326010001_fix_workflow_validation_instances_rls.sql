-- Fix: migration 20260316073418 replaced the targeted SELECT policy
-- "Users can view relevant validation instances" with a broad one
-- "wf_runtime_instances_select" USING (auth.uid() IS NOT NULL),
-- which allows any authenticated user to read all validation instances.
--
-- We drop the overly broad policy and restore the targeted one.

DROP POLICY IF EXISTS "wf_runtime_instances_select" ON public.workflow_validation_instances;

-- Only approvers, deciders and admins can see validation instances
CREATE POLICY "wf_validation_instances_select"
  ON public.workflow_validation_instances
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      approver_id = current_profile_id() OR
      decided_by = current_profile_id() OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );
