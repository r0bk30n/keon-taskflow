
-- Fix the view: use security_invoker=on and fix the base table policy to allow own rows
DROP VIEW IF EXISTS public.user_microsoft_connections_public;

-- Allow users to see their own non-sensitive columns via a restricted SELECT policy
DROP POLICY IF EXISTS "No direct SELECT on microsoft connections" ON public.user_microsoft_connections;
CREATE POLICY "Users can view own microsoft connection metadata"
  ON public.user_microsoft_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Recreate view with security_invoker=on (safe: RLS filters by user_id)
CREATE VIEW public.user_microsoft_connections_public
WITH (security_invoker = on) AS
  SELECT 
    id, user_id, profile_id, email, display_name,
    is_calendar_sync_enabled, is_email_sync_enabled,
    last_sync_at, token_expires_at, created_at, updated_at
  FROM public.user_microsoft_connections;
