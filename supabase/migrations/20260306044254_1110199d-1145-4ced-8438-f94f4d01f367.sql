
-- ========================================================
-- Security Fix: Tighten RLS policies across multiple tables
-- ========================================================

-- 1. Fix task-attachments storage: verify task access via folder structure
-- Files are stored as {task_id}/{filename} in the bucket
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
CREATE POLICY "Users can view task attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND public.can_access_task((string_to_array(name, '/'))[1]::uuid)
);

-- 2. Fix wf_runtime_logs: prevent arbitrary inserts from clients
DROP POLICY IF EXISTS "wf_runtime_logs_insert" ON public.wf_runtime_logs;
CREATE POLICY "wf_runtime_logs_insert_admin"
  ON public.wf_runtime_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. Fix collaborator_groups: ensure TO authenticated role
DROP POLICY IF EXISTS "Authenticated users can view collaborator groups" ON public.collaborator_groups;
CREATE POLICY "Authenticated users can view collaborator groups"
  ON public.collaborator_groups
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.collaborator_group_members;
CREATE POLICY "Authenticated users can view group members"
  ON public.collaborator_group_members
  FOR SELECT TO authenticated
  USING (true);

-- 4. Fix user_microsoft_connections_public view: add RLS-like restriction
DROP VIEW IF EXISTS public.user_microsoft_connections_public;
CREATE VIEW public.user_microsoft_connections_public
WITH (security_invoker = off) AS
  SELECT 
    id, user_id, profile_id, email, display_name,
    is_calendar_sync_enabled, is_email_sync_enabled,
    last_sync_at, token_expires_at, created_at, updated_at
  FROM public.user_microsoft_connections
  WHERE user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');

-- 5. Fix supplier_purchase_permissions: restrict SELECT to own email + admin
DROP POLICY IF EXISTS "Users can check their own permission" ON public.supplier_purchase_permissions;
CREATE POLICY "Users can check their own supplier permission"
  ON public.supplier_purchase_permissions
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
