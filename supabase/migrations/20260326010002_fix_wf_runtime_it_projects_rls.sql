-- =============================================================
-- Fix 1: wf_runtime_instances — FOR ALL USING (true) is too broad
-- Instances are created/updated exclusively by the wf-engine edge function
-- (service role, bypasses RLS). Regular users should only read instances
-- linked to tasks they can see. Admins can manage all.
-- =============================================================

DROP POLICY IF EXISTS "wf_runtime_instances_all" ON public.wf_runtime_instances;
DROP POLICY IF EXISTS "wf_runtime_instances_select" ON public.wf_runtime_instances;

-- Read: user must be the task creator/assignee or an admin
CREATE POLICY "wf_runtime_instances_select"
  ON public.wf_runtime_instances
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = demand_id
        AND (
          t.user_id = auth.uid()
          OR t.assignee_id = current_profile_id()
        )
    )
  );

-- Mutations: admins only (the edge function uses service role)
CREATE POLICY "wf_runtime_instances_admin_manage"
  ON public.wf_runtime_instances
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- Fix 2: it_projects — INSERT/UPDATE/DELETE open to all authenticated
-- Keep SELECT open (catalogue-style), restrict mutations to admins.
-- =============================================================

DROP POLICY IF EXISTS "Authenticated users can insert it_projects" ON public.it_projects;
DROP POLICY IF EXISTS "Authenticated users can update it_projects" ON public.it_projects;
DROP POLICY IF EXISTS "Authenticated users can delete it_projects" ON public.it_projects;

CREATE POLICY "it_projects_admin_insert"
  ON public.it_projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "it_projects_admin_update"
  ON public.it_projects FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "it_projects_admin_delete"
  ON public.it_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- Fix 3: it_project_phase_progress — FOR ALL USING (true)
-- Progress is updated server-side; keep read open, restrict mutations.
-- =============================================================

DROP POLICY IF EXISTS "Authenticated users can manage phase progress" ON public.it_project_phase_progress;

CREATE POLICY "it_project_phase_progress_select"
  ON public.it_project_phase_progress FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "it_project_phase_progress_admin_manage"
  ON public.it_project_phase_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
