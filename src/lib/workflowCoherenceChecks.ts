// Workflow coherence analysis engine
import type { WfStep, WfTransition, WfAction, WfNotification } from '@/types/workflow';
import type { WfTaskConfig, WfValidationConfig } from '@/types/workflowTaskConfig';

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface CoherenceCheck {
  id: string;
  severity: CheckSeverity;
  category: string;
  message: string;
  target?: string; // step_key, task_key, etc.
  targetType?: 'step' | 'task' | 'validation' | 'transition' | 'action';
}

export function runCoherenceChecks(
  steps: WfStep[],
  transitions: WfTransition[],
  actions: WfAction[],
  notifications: WfNotification[],
  taskConfigs: WfTaskConfig[],
  validationConfigs: WfValidationConfig[],
): CoherenceCheck[] {
  const checks: CoherenceCheck[] = [];
  let idx = 0;
  const id = () => `chk-${++idx}`;

  const activeSteps = steps.filter(s => s.is_active);
  const stepKeys = new Set(activeSteps.map(s => s.step_key));

  // --- STRUCTURE CHECKS ---

  // No start step
  if (!activeSteps.some(s => s.step_type === 'start')) {
    checks.push({ id: id(), severity: 'error', category: 'Structure', message: 'Aucune étape de départ définie.' });
  }

  // No end step
  if (!activeSteps.some(s => s.step_type === 'end')) {
    checks.push({ id: id(), severity: 'error', category: 'Structure', message: 'Aucune étape de fin définie.' });
  }

  // Multiple start steps
  if (activeSteps.filter(s => s.step_type === 'start').length > 1) {
    checks.push({ id: id(), severity: 'warning', category: 'Structure', message: 'Plusieurs étapes de départ détectées.' });
  }

  // --- STEP CHECKS ---
  const activeTransitions = transitions.filter(t => t.is_active);

  for (const step of activeSteps) {
    const outgoing = activeTransitions.filter(t => t.from_step_key === step.step_key);
    const incoming = activeTransitions.filter(t => t.to_step_key === step.step_key);

    // No outgoing transition (except end)
    if (step.step_type !== 'end' && outgoing.length === 0) {
      checks.push({
        id: id(), severity: 'warning', category: 'Étapes',
        message: `L'étape "${step.name}" n'a aucune transition de sortie.`,
        target: step.step_key, targetType: 'step',
      });
    }

    // No incoming transition (except start)
    if (step.step_type !== 'start' && incoming.length === 0) {
      checks.push({
        id: id(), severity: 'warning', category: 'Étapes',
        message: `L'étape "${step.name}" est orpheline (aucune transition entrante).`,
        target: step.step_key, targetType: 'step',
      });
    }
  }

  // Duplicate step keys
  const stepKeyCount = new Map<string, number>();
  steps.forEach(s => stepKeyCount.set(s.step_key, (stepKeyCount.get(s.step_key) || 0) + 1));
  for (const [key, count] of stepKeyCount) {
    if (count > 1) {
      checks.push({
        id: id(), severity: 'error', category: 'Étapes',
        message: `Clé technique dupliquée : "${key}" (${count} occurrences).`,
        target: key, targetType: 'step',
      });
    }
  }

  // --- TRANSITION CHECKS ---
  for (const t of activeTransitions) {
    if (!stepKeys.has(t.from_step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Transitions',
        message: `Transition depuis une étape inexistante : "${t.from_step_key}".`,
        target: t.id, targetType: 'transition',
      });
    }
    if (!stepKeys.has(t.to_step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Transitions',
        message: `Transition vers une étape inexistante : "${t.to_step_key}".`,
        target: t.id, targetType: 'transition',
      });
    }
  }

  // --- TASK CHECKS ---
  const activeTasks = taskConfigs.filter(t => t.is_active);
  const taskKeys = new Set(activeTasks.map(t => t.task_key));

  for (const task of taskConfigs) {
    // Task without parent step
    if (!stepKeys.has(task.step_key)) {
      checks.push({
        id: id(), severity: task.is_active ? 'error' : 'warning', category: 'Tâches',
        message: `La tâche "${task.name}" référence une étape inexistante : "${task.step_key}".`,
        target: task.task_key, targetType: 'task',
      });
    }

    if (task.is_active) {
      // No completion behavior
      if (!task.completion_behavior) {
        checks.push({
          id: id(), severity: 'warning', category: 'Tâches',
          message: `La tâche "${task.name}" n'a pas de mode de fin configuré.`,
          target: task.task_key, targetType: 'task',
        });
      }

      // Target step missing
      if ((task.completion_behavior === 'close_and_goto_step') && !task.completion_target_step_key) {
        checks.push({
          id: id(), severity: 'error', category: 'Tâches',
          message: `La tâche "${task.name}" doit aller à une étape cible mais aucune n'est définie.`,
          target: task.task_key, targetType: 'task',
        });
      }

      if (task.completion_target_step_key && !stepKeys.has(task.completion_target_step_key)) {
        checks.push({
          id: id(), severity: 'error', category: 'Tâches',
          message: `La tâche "${task.name}" cible l'étape "${task.completion_target_step_key}" qui n'existe pas.`,
          target: task.task_key, targetType: 'task',
        });
      }

      // Trigger after task referencing missing task
      if (task.trigger_mode === 'after_task' && task.trigger_task_key && !taskKeys.has(task.trigger_task_key)) {
        checks.push({
          id: id(), severity: 'error', category: 'Tâches',
          message: `La tâche "${task.name}" est déclenchée après "${task.trigger_task_key}" qui n'existe pas.`,
          target: task.task_key, targetType: 'task',
        });
      }
    }

    // Inactive but referenced
    if (!task.is_active) {
      const referenced = activeTasks.some(t => t.trigger_task_key === task.task_key);
      if (referenced) {
        checks.push({
          id: id(), severity: 'warning', category: 'Tâches',
          message: `La tâche "${task.name}" est inactive mais référencée par une autre tâche.`,
          target: task.task_key, targetType: 'task',
        });
      }
    }
  }

  // Duplicate task keys
  const taskKeyCount = new Map<string, number>();
  taskConfigs.forEach(t => taskKeyCount.set(t.task_key, (taskKeyCount.get(t.task_key) || 0) + 1));
  for (const [key, count] of taskKeyCount) {
    if (count > 1) {
      checks.push({
        id: id(), severity: 'error', category: 'Tâches',
        message: `Clé technique de tâche dupliquée : "${key}" (${count}).`,
        target: key, targetType: 'task',
      });
    }
  }

  // --- VALIDATION CHECKS ---
  for (const v of validationConfigs.filter(vc => vc.is_active)) {
    if (!v.on_approved_effect) {
      checks.push({
        id: id(), severity: 'warning', category: 'Validations',
        message: `La validation "${v.name}" n'a pas de comportement si validé.`,
        target: v.validation_key, targetType: 'validation',
      });
    }
    if (!v.on_rejected_effect) {
      checks.push({
        id: id(), severity: 'warning', category: 'Validations',
        message: `La validation "${v.name}" n'a pas de comportement si refusé.`,
        target: v.validation_key, targetType: 'validation',
      });
    }
    if (v.on_approved_target_step_key && !stepKeys.has(v.on_approved_target_step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Validations',
        message: `Validation "${v.name}" : étape cible (si validé) "${v.on_approved_target_step_key}" inexistante.`,
        target: v.validation_key, targetType: 'validation',
      });
    }
    if (v.on_rejected_target_step_key && !stepKeys.has(v.on_rejected_target_step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Validations',
        message: `Validation "${v.name}" : étape cible (si refusé) "${v.on_rejected_target_step_key}" inexistante.`,
        target: v.validation_key, targetType: 'validation',
      });
    }
    if (v.source_step_key && !stepKeys.has(v.source_step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Validations',
        message: `Validation "${v.name}" : étape source "${v.source_step_key}" inexistante.`,
        target: v.validation_key, targetType: 'validation',
      });
    }
  }

  // --- ACTION CHECKS ---
  for (const a of actions.filter(ac => ac.is_active)) {
    if (a.step_key && !stepKeys.has(a.step_key)) {
      checks.push({
        id: id(), severity: 'error', category: 'Actions',
        message: `Action "${a.action_type}" rattachée à l'étape "${a.step_key}" inexistante.`,
        target: a.id, targetType: 'action',
      });
    }
  }

  // --- SEQUENCE CHECK ---
  const sortedSteps = [...activeSteps].sort((a, b) => a.order_index - b.order_index);
  for (let i = 0; i < sortedSteps.length - 1; i++) {
    if (sortedSteps[i].order_index === sortedSteps[i + 1].order_index) {
      checks.push({
        id: id(), severity: 'info', category: 'Séquence',
        message: `Les étapes "${sortedSteps[i].name}" et "${sortedSteps[i + 1].name}" ont le même index de séquence (${sortedSteps[i].order_index}).`,
      });
    }
  }

  // --- LOOP DETECTION (simple) ---
  // Check for direct self-loops
  for (const t of activeTransitions) {
    if (t.from_step_key === t.to_step_key) {
      checks.push({
        id: id(), severity: 'warning', category: 'Boucles',
        message: `Boucle directe détectée sur l'étape "${steps.find(s => s.step_key === t.from_step_key)?.name || t.from_step_key}".`,
        target: t.from_step_key, targetType: 'step',
      });
    }
  }

  return checks;
}
