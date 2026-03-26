-- =========================================================
-- Allow updating builtin spreadsheet field templates
--
-- Problem:
-- - Spreadsheet headers are stored in questionnaire_field_definitions.spreadsheet_template
-- - UI updates that column on the field definition
-- - Existing RLS policy `qfd_update` only allows UPDATE when is_builtin=false
--   which blocks updates for builtin spreadsheet fields => headers not persistent
--
-- Fix:
-- - Allow UPDATE for:
--   - custom fields (is_builtin=false) as before (permission profile write or admin)
--   - builtin spreadsheet fields (is_builtin=true AND type_champ='spreadsheet')
--     when the user has write permission on the pilier or is admin
--
-- Note:
-- - RLS is row-based, not column-based. We still restrict the scope to
--   builtin rows that are spreadsheets to match intended behavior.
-- =========================================================

BEGIN;

DROP POLICY IF EXISTS "qfd_update" ON public.questionnaire_field_definitions;

CREATE POLICY "qfd_update"
ON public.questionnaire_field_definitions FOR UPDATE
TO authenticated
USING (
  (
    is_builtin = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.permission_profiles pp ON pp.id = p.permission_profile_id
        WHERE p.user_id = auth.uid()
        AND (
          (pilier_code = '00' AND pp.qst_pilier_00_write = true) OR
          (pilier_code = '02' AND pp.qst_pilier_02_write = true) OR
          (pilier_code = '04' AND pp.qst_pilier_04_write = true) OR
          (pilier_code = '05' AND pp.qst_pilier_05_write = true) OR
          (pilier_code = '06' AND pp.qst_pilier_06_write = true) OR
          (pilier_code = '07' AND pp.qst_pilier_07_write = true)
        )
      )
    )
  )
  OR
  (
    is_builtin = true
    AND type_champ = 'spreadsheet'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.permission_profiles pp ON pp.id = p.permission_profile_id
        WHERE p.user_id = auth.uid()
        AND (
          (pilier_code = '00' AND pp.qst_pilier_00_write = true) OR
          (pilier_code = '02' AND pp.qst_pilier_02_write = true) OR
          (pilier_code = '04' AND pp.qst_pilier_04_write = true) OR
          (pilier_code = '05' AND pp.qst_pilier_05_write = true) OR
          (pilier_code = '06' AND pp.qst_pilier_06_write = true) OR
          (pilier_code = '07' AND pp.qst_pilier_07_write = true)
        )
      )
    )
  )
)
WITH CHECK (
  (is_builtin = false)
  OR (is_builtin = true AND type_champ = 'spreadsheet')
);

COMMIT;

