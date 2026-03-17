
-- Update assign_task_number to handle personal tasks (no project, no parent request)
-- by using 'PERSO' as fallback project code

CREATE OR REPLACE FUNCTION public.assign_task_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_code text;
  v_entity_type text;
  v_number text;
BEGIN
  v_project_code := public.get_project_code_for_entity(NEW.be_project_id, NEW.parent_request_id);
  
  -- Fallback: use 'PERSO' for personal tasks (no project, no parent request)
  IF v_project_code IS NULL THEN
    v_project_code := 'PERSO';
  END IF;

  IF NEW.type = 'request' THEN
    v_entity_type := 'request';

    IF NEW.request_number IS NULL THEN
      v_number := public.next_entity_number(v_project_code, v_entity_type);
      NEW.request_number := v_number;

      IF NEW.title IS NOT NULL AND NOT NEW.title LIKE v_number || ' — %' AND NOT NEW.title LIKE v_number || '%' THEN
        NEW.title := v_number || ' — ' || NEW.title;
      ELSIF NEW.title IS NULL OR NEW.title = '' THEN
        NEW.title := v_number;
      END IF;
    END IF;

  ELSIF NEW.type = 'task' THEN
    v_entity_type := 'task';

    IF NEW.task_number IS NULL THEN
      v_number := public.next_entity_number(v_project_code, v_entity_type);
      NEW.task_number := v_number;

      IF NEW.title IS NOT NULL AND NOT NEW.title LIKE v_number || ' — %' AND NOT NEW.title LIKE v_number || '%' THEN
        NEW.title := v_number || ' — ' || NEW.title;
      ELSIF NEW.title IS NULL OR NEW.title = '' THEN
        NEW.title := v_number;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Also update the AFTER INSERT trace function to handle personal tasks
CREATE OR REPLACE FUNCTION public.insert_task_trace_number_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_code text;
  v_request_number text;
BEGIN
  v_project_code := public.get_project_code_for_entity(NEW.be_project_id, NEW.parent_request_id);
  
  -- Fallback for personal tasks
  IF v_project_code IS NULL THEN
    v_project_code := 'PERSO';
  END IF;

  IF NEW.type = 'request' THEN
    IF NEW.request_number IS NOT NULL THEN
      INSERT INTO public.request_trace_numbers (project_code, request_id, request_number)
      VALUES (v_project_code, NEW.id, NEW.request_number);
    END IF;

  ELSIF NEW.type = 'task' THEN
    SELECT t.request_number
    INTO v_request_number
    FROM public.tasks t
    WHERE t.id = NEW.parent_request_id;

    IF NEW.task_number IS NOT NULL THEN
      INSERT INTO public.request_trace_numbers (
        project_code,
        task_id,
        task_number,
        request_id,
        request_number
      )
      VALUES (
        v_project_code,
        NEW.id,
        NEW.task_number,
        NEW.parent_request_id,
        v_request_number
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
