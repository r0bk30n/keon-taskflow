
-- ============================================================
-- PHASE 2 : Migration des données existantes vers wf_*
-- Idempotent : utilise ON CONFLICT / WHERE NOT EXISTS
-- ============================================================

-- 2.1 Migrer workflow_templates → wf_workflows
INSERT INTO public.wf_workflows (id, sub_process_template_id, name, description, is_active, is_draft, version, legacy_workflow_id, created_at, updated_at, published_at)
SELECT 
  gen_random_uuid(),
  wt.sub_process_template_id,
  wt.name,
  wt.description,
  wt.status = 'active',
  wt.status = 'draft',
  wt.version,
  wt.id,
  wt.created_at,
  wt.updated_at,
  wt.published_at
FROM public.workflow_templates wt
WHERE wt.sub_process_template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.wf_workflows w WHERE w.legacy_workflow_id = wt.id
  );

-- 2.2 Migrer workflow_nodes → wf_steps
-- Compute order from node position_y, map node_type to step_type
-- Also create assignment rules for task nodes with responsible info

-- First: create assignment rules for task nodes
INSERT INTO public.wf_assignment_rules (id, name, type, target_id)
SELECT DISTINCT
  gen_random_uuid(),
  'Dept: ' || COALESCE((wn.config->>'responsible_id')::text, 'auto'),
  'department'::wf_assignment_type,
  (wn.config->>'responsible_id')::uuid
FROM public.workflow_nodes wn
JOIN public.wf_workflows w ON w.legacy_workflow_id = wn.workflow_id
WHERE wn.node_type = 'task'
  AND wn.config->>'responsible_type' = 'department'
  AND wn.config->>'responsible_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.wf_assignment_rules ar 
    WHERE ar.type = 'department' 
      AND ar.target_id = (wn.config->>'responsible_id')::uuid
  )
ON CONFLICT DO NOTHING;

-- Now insert steps
DO $$
DECLARE
  rec RECORD;
  v_wf_id UUID;
  v_step_type public.wf_step_type;
  v_state_label TEXT;
  v_order INT;
  v_step_key TEXT;
  v_assignment_rule_id UUID;
BEGIN
  FOR rec IN 
    SELECT wn.*, w.id as new_wf_id,
      ROW_NUMBER() OVER (PARTITION BY wn.workflow_id ORDER BY wn.position_y, wn.position_x) as rn
    FROM public.workflow_nodes wn
    JOIN public.wf_workflows w ON w.legacy_workflow_id = wn.workflow_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wf_steps s WHERE s.legacy_node_id = wn.id
    )
    ORDER BY wn.workflow_id, wn.position_y, wn.position_x
  LOOP
    v_wf_id := rec.new_wf_id;
    v_order := rec.rn::int;
    
    -- Map node_type to step_type
    CASE rec.node_type::text
      WHEN 'start' THEN v_step_type := 'start'; v_state_label := 'Démarrage';
      WHEN 'end' THEN v_step_type := 'end'; v_state_label := 'Terminé';
      WHEN 'task' THEN v_step_type := 'execution'; v_state_label := 'En cours';
      WHEN 'validation' THEN v_step_type := 'validation'; v_state_label := 'En attente de validation';
      WHEN 'notification' THEN v_step_type := 'notification'; v_state_label := 'Notification';
      WHEN 'assignment' THEN v_step_type := 'assignment'; v_state_label := 'Affectation';
      WHEN 'condition' THEN v_step_type := 'automatic'; v_state_label := 'Condition';
      WHEN 'sub_process' THEN v_step_type := 'subprocess'; v_state_label := 'Sous-processus';
      WHEN 'status_change' THEN v_step_type := 'automatic'; v_state_label := 'Changement statut';
      ELSE v_step_type := 'execution'; v_state_label := rec.label;
    END CASE;
    
    -- Generate stable step_key from node id
    v_step_key := 'step_' || replace(rec.id::text, '-', '_');
    
    -- Find assignment rule for task nodes
    v_assignment_rule_id := NULL;
    IF rec.node_type::text = 'task' AND rec.config->>'responsible_type' = 'department' AND rec.config->>'responsible_id' IS NOT NULL THEN
      SELECT ar.id INTO v_assignment_rule_id
      FROM public.wf_assignment_rules ar
      WHERE ar.type = 'department' AND ar.target_id = (rec.config->>'responsible_id')::uuid
      LIMIT 1;
    END IF;
    
    INSERT INTO public.wf_steps (
      workflow_id, step_key, order_index, name, step_type, state_label,
      is_required, is_active, assignment_rule_id, validation_mode,
      legacy_node_id, created_at, updated_at
    ) VALUES (
      v_wf_id, v_step_key, v_order, rec.label, v_step_type, v_state_label,
      true, true, v_assignment_rule_id, 'none',
      rec.id, rec.created_at, rec.updated_at
    );
  END LOOP;
END;
$$;

-- 2.3 Migrer workflow_edges → wf_transitions
INSERT INTO public.wf_transitions (workflow_id, from_step_key, event, to_step_key, is_active)
SELECT 
  w.id,
  s_from.step_key,
  CASE 
    WHEN s_from.step_type = 'validation' THEN 'approved'
    WHEN s_from.step_type = 'execution' THEN 'done'
    ELSE 'done'
  END,
  s_to.step_key,
  true
FROM public.workflow_edges we
JOIN public.wf_workflows w ON w.legacy_workflow_id = we.workflow_id
JOIN public.wf_steps s_from ON s_from.legacy_node_id = we.source_node_id AND s_from.workflow_id = w.id
JOIN public.wf_steps s_to ON s_to.legacy_node_id = we.target_node_id AND s_to.workflow_id = w.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.wf_transitions t 
  WHERE t.workflow_id = w.id AND t.from_step_key = s_from.step_key AND t.to_step_key = s_to.step_key
);

-- 2.4 Migrer notification nodes → wf_notifications
INSERT INTO public.wf_notifications (workflow_id, step_key, event, channels_json, recipients_rules_json, subject_template, body_template, action_url_template, is_active)
SELECT 
  s.workflow_id,
  s.step_key,
  'enter',
  COALESCE(
    (SELECT jsonb_agg(ch) FROM jsonb_array_elements_text(
      CASE jsonb_typeof(wn.config->'channels')
        WHEN 'array' THEN wn.config->'channels'
        ELSE '["in_app"]'::jsonb
      END
    ) AS ch),
    '["in_app"]'::jsonb
  ),
  jsonb_build_array(jsonb_build_object('type', COALESCE(wn.config->>'recipient_type', 'requester'))),
  wn.config->>'subject_template',
  wn.config->>'body_template',
  wn.config->>'action_url_template',
  true
FROM public.workflow_nodes wn
JOIN public.wf_steps s ON s.legacy_node_id = wn.id
WHERE wn.node_type = 'notification'
  AND NOT EXISTS (
    SELECT 1 FROM public.wf_notifications n WHERE n.step_key = s.step_key AND n.workflow_id = s.workflow_id
  );

-- 2.5 Migrer workflow_runs en cours → wf_runtime_instances
INSERT INTO public.wf_runtime_instances (demand_id, workflow_id, current_step_key, current_state_label, started_at, completed_at, status, context_data, legacy_run_id)
SELECT 
  wr.trigger_entity_id,
  w.id,
  COALESCE(s.step_key, 'step_start'),
  COALESCE(s.state_label, 'En cours'),
  wr.started_at,
  wr.completed_at,
  CASE wr.status::text
    WHEN 'running' THEN 'running'::wf_instance_status
    WHEN 'completed' THEN 'completed'::wf_instance_status
    WHEN 'failed' THEN 'failed'::wf_instance_status
    WHEN 'cancelled' THEN 'cancelled'::wf_instance_status
    WHEN 'paused' THEN 'paused'::wf_instance_status
    ELSE 'running'::wf_instance_status
  END,
  COALESCE(wr.context_data, '{}'::jsonb),
  wr.id
FROM public.workflow_runs wr
JOIN public.wf_workflows w ON w.legacy_workflow_id = wr.workflow_id
LEFT JOIN public.wf_steps s ON s.legacy_node_id = wr.current_node_id AND s.workflow_id = w.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.wf_runtime_instances ri WHERE ri.legacy_run_id = wr.id
);

-- 2.6 Migrer workflow_events → wf_runtime_logs (for active runs)
INSERT INTO public.wf_runtime_logs (instance_id, workflow_id, step_key, event, message, actor_id, payload_json, created_at)
SELECT 
  ri.id,
  ri.workflow_id,
  NULL,
  we.event_type,
  we.event_type || ' on ' || we.entity_type,
  we.triggered_by,
  we.payload,
  we.created_at
FROM public.workflow_events we
JOIN public.wf_runtime_instances ri ON ri.legacy_run_id = we.run_id
WHERE we.run_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.wf_runtime_logs rl 
    WHERE rl.instance_id = ri.id AND rl.created_at = we.created_at AND rl.event = we.event_type
  );
