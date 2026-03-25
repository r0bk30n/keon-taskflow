-- =========================================================
-- Spreadsheet support in dynamic questionnaire fields
-- - Add spreadsheet_template on questionnaire_field_definitions (template shared across projects)
-- - Add valeur_jsonb on project_field_values (per-project sparse sparse JSON storage)
-- - Extend questionnaire_field_definitions.type_champ enum-like CHECK to include 'spreadsheet'
-- =========================================================

BEGIN;

ALTER TABLE public.questionnaire_field_definitions
ADD COLUMN IF NOT EXISTS spreadsheet_template JSONB;

ALTER TABLE public.project_field_values
ADD COLUMN IF NOT EXISTS valeur_jsonb JSONB;

-- Replace the type_champ CHECK constraint to include 'spreadsheet'
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.questionnaire_field_definitions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type_champ%'
    AND pg_get_constraintdef(oid) ILIKE '%text%textarea%select%number%percentage%euros%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questionnaire_field_definitions DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.questionnaire_field_definitions
ADD CONSTRAINT questionnaire_field_definitions_type_champ_check
CHECK (type_champ IN ('text','textarea','select','number','percentage','euros','spreadsheet'));

COMMIT;

