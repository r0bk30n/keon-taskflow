DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_questionnaire_project_id_champ_id_key'
  ) THEN
    ALTER TABLE public.project_questionnaire ADD CONSTRAINT project_questionnaire_project_id_champ_id_key UNIQUE (project_id, champ_id);
  END IF;
END $$;