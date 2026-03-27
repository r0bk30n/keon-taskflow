-- Fix: "System can manage notifications" policy was FOR ALL USING (auth.uid() IS NOT NULL),
-- allowing any authenticated user to INSERT/UPDATE/DELETE all notifications.
-- The actual inserts are done by the wf-engine edge function using the service role (bypasses RLS),
-- so a broad authenticated policy is unnecessary.
-- We replace it with a narrower policy: only admins can mutate notifications they don't own.

DROP POLICY IF EXISTS "System can manage notifications" ON public.workflow_notifications;

-- Admins can manage all notifications (needed for admin UI / cleanup)
CREATE POLICY "wf_notifications_admin_manage"
  ON public.workflow_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
