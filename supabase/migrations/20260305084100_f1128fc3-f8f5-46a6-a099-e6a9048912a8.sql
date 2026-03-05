
-- ============================================================
-- PHASE 1 : Nouveau schéma workflow (tables wf_*)
-- ============================================================

-- 1. Enums
CREATE TYPE public.wf_step_type AS ENUM (
  'start', 'end', 'validation', 'execution', 'assignment', 'automatic', 'subprocess', 'notification'
);

CREATE TYPE public.wf_validation_mode AS ENUM (
  'none', 'simple', 'n_of_m', 'sequence'
);

CREATE TYPE public.wf_assignment_type AS ENUM (
  'user', 'manager', 'requester', 'group', 'department', 'job_title'
);

CREATE TYPE public.wf_action_type AS ENUM (
  'db_insert', 'db_update', 'create_task', 'set_field'
);

CREATE TYPE public.wf_instance_status AS ENUM (
  'running', 'completed', 'failed', 'cancelled', 'paused'
);

-- 2. wf_assignment_rules (réutilisables)
CREATE TABLE public.wf_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type wf_assignment_type NOT NULL,
  target_id UUID,
  fallback_rule_id UUID REFERENCES public.wf_assignment_rules(id),
  watchers_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wf_assignment_rules ENABLE ROW LEVEL SECURITY;

-- 3. wf_workflows
CREATE TABLE public.wf_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_process_template_id UUID REFERENCES public.sub_process_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  default_subprocess_mode TEXT NOT NULL DEFAULT 'blocking',
  legacy_workflow_id UUID REFERENCES public.workflow_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX idx_wf_workflows_spt ON public.wf_workflows(sub_process_template_id);
ALTER TABLE public.wf_workflows ENABLE ROW LEVEL SECURITY;

-- 4. wf_steps
CREATE TABLE public.wf_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  step_type wf_step_type NOT NULL DEFAULT 'execution',
  state_label TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assignment_rule_id UUID REFERENCES public.wf_assignment_rules(id),
  validation_mode wf_validation_mode NOT NULL DEFAULT 'none',
  n_required INT,
  legacy_node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_key)
);
CREATE INDEX idx_wf_steps_workflow ON public.wf_steps(workflow_id);
ALTER TABLE public.wf_steps ENABLE ROW LEVEL SECURITY;

-- 5. wf_step_sequence_validators (mode séquence)
CREATE TABLE public.wf_step_sequence_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.wf_steps(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  assignment_rule_id UUID NOT NULL REFERENCES public.wf_assignment_rules(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_ssv_step ON public.wf_step_sequence_validators(step_id);
ALTER TABLE public.wf_step_sequence_validators ENABLE ROW LEVEL SECURITY;

-- 6. wf_step_pool_validators (mode n_of_m)
CREATE TABLE public.wf_step_pool_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.wf_steps(id) ON DELETE CASCADE,
  assignment_rule_id UUID NOT NULL REFERENCES public.wf_assignment_rules(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_spv_step ON public.wf_step_pool_validators(step_id);
ALTER TABLE public.wf_step_pool_validators ENABLE ROW LEVEL SECURITY;

-- 7. wf_transitions
CREATE TABLE public.wf_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  from_step_key TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'done',
  condition_json JSONB,
  to_step_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_transitions_workflow ON public.wf_transitions(workflow_id);
ALTER TABLE public.wf_transitions ENABLE ROW LEVEL SECURITY;

-- 8. wf_notifications
CREATE TABLE public.wf_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'enter',
  channels_json JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  recipients_rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject_template TEXT,
  body_template TEXT,
  action_url_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_notifications_workflow ON public.wf_notifications(workflow_id);
ALTER TABLE public.wf_notifications ENABLE ROW LEVEL SECURITY;

-- 9. wf_actions
CREATE TABLE public.wf_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  transition_id UUID REFERENCES public.wf_transitions(id) ON DELETE SET NULL,
  step_key TEXT,
  order_index INT NOT NULL DEFAULT 0,
  action_type wf_action_type NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  on_error TEXT NOT NULL DEFAULT 'continue',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_actions_workflow ON public.wf_actions(workflow_id);
ALTER TABLE public.wf_actions ENABLE ROW LEVEL SECURITY;

-- 10. wf_model_tasks (tâches spécifiques au workflow)
CREATE TABLE public.wf_model_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  origin_step_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee_rule_snapshot_json JSONB,
  assignee_user_id_resolved UUID,
  due_date TIMESTAMPTZ,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_model_tasks_workflow ON public.wf_model_tasks(workflow_id);
CREATE INDEX idx_wf_model_tasks_demand ON public.wf_model_tasks(demand_id);
ALTER TABLE public.wf_model_tasks ENABLE ROW LEVEL SECURITY;

-- 11. wf_runtime_instances
CREATE TABLE public.wf_runtime_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id),
  current_step_key TEXT,
  current_state_label TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status wf_instance_status NOT NULL DEFAULT 'running',
  context_data JSONB DEFAULT '{}'::jsonb,
  legacy_run_id UUID REFERENCES public.workflow_runs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_runtime_demand ON public.wf_runtime_instances(demand_id);
CREATE INDEX idx_wf_runtime_workflow ON public.wf_runtime_instances(workflow_id);
CREATE INDEX idx_wf_runtime_status ON public.wf_runtime_instances(status);
ALTER TABLE public.wf_runtime_instances ENABLE ROW LEVEL SECURITY;

-- 12. wf_runtime_logs
CREATE TABLE public.wf_runtime_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.wf_runtime_instances(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id),
  step_key TEXT,
  event TEXT NOT NULL,
  message TEXT,
  actor_id UUID,
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_runtime_logs_instance ON public.wf_runtime_logs(instance_id);
ALTER TABLE public.wf_runtime_logs ENABLE ROW LEVEL SECURITY;

-- 13. RLS policies (authenticated users for config, scoped for runtime)
-- Config tables: readable by authenticated, writable by admins
CREATE POLICY "wf_workflows_select" ON public.wf_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_workflows_all" ON public.wf_workflows FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_steps_select" ON public.wf_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_steps_all" ON public.wf_steps FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_transitions_select" ON public.wf_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_transitions_all" ON public.wf_transitions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_notifications_select" ON public.wf_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_notifications_all" ON public.wf_notifications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_actions_select" ON public.wf_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_actions_all" ON public.wf_actions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_assignment_rules_select" ON public.wf_assignment_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_assignment_rules_all" ON public.wf_assignment_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_ssv_select" ON public.wf_step_sequence_validators FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_ssv_all" ON public.wf_step_sequence_validators FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_spv_select" ON public.wf_step_pool_validators FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_spv_all" ON public.wf_step_pool_validators FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "wf_model_tasks_select" ON public.wf_model_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_model_tasks_all" ON public.wf_model_tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Runtime tables: accessible by authenticated users
CREATE POLICY "wf_runtime_instances_select" ON public.wf_runtime_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_runtime_instances_all" ON public.wf_runtime_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "wf_runtime_logs_select" ON public.wf_runtime_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_runtime_logs_insert" ON public.wf_runtime_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 14. Trigger updated_at
CREATE OR REPLACE FUNCTION public.wf_update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER wf_workflows_updated_at BEFORE UPDATE ON public.wf_workflows FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_steps_updated_at BEFORE UPDATE ON public.wf_steps FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_transitions_updated_at BEFORE UPDATE ON public.wf_transitions FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_notifications_updated_at BEFORE UPDATE ON public.wf_notifications FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_actions_updated_at BEFORE UPDATE ON public.wf_actions FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_assignment_rules_updated_at BEFORE UPDATE ON public.wf_assignment_rules FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_model_tasks_updated_at BEFORE UPDATE ON public.wf_model_tasks FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();
CREATE TRIGGER wf_runtime_instances_updated_at BEFORE UPDATE ON public.wf_runtime_instances FOR EACH ROW EXECUTE FUNCTION public.wf_update_updated_at();

-- 15. Prevent step_key modification after creation
CREATE OR REPLACE FUNCTION public.wf_prevent_step_key_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.step_key IS DISTINCT FROM NEW.step_key THEN
    RAISE EXCEPTION 'step_key cannot be modified after creation (was: %, new: %)', OLD.step_key, NEW.step_key;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wf_steps_prevent_key_change BEFORE UPDATE ON public.wf_steps FOR EACH ROW EXECUTE FUNCTION public.wf_prevent_step_key_change();
