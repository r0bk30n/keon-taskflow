import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Play, RotateCcw, ArrowRight, CheckCircle, XCircle, ListTodo,
  Shield, Zap, ChevronRight, Circle, User,
} from 'lucide-react';
import type { WfStep, WfTransition, WfAction } from '@/types/workflow';
import { WF_STEP_TYPE_LABELS, WF_EVENT_LABELS, WF_ACTION_TYPE_LABELS } from '@/types/workflow';
import type { WfTaskConfig, WfValidationConfig } from '@/types/workflowTaskConfig';
import {
  EXECUTOR_TYPE_LABELS, COMPLETION_BEHAVIOR_LABELS,
  ON_APPROVED_LABELS, ON_REJECTED_LABELS,
} from '@/types/workflowTaskConfig';

interface Props {
  steps: WfStep[];
  transitions: WfTransition[];
  actions: WfAction[];
  taskConfigs: WfTaskConfig[];
  validationConfigs: WfValidationConfig[];
}

type TaskOutcome = 'completed' | 'refused' | 'cancelled';
type ValidationOutcome = 'approved' | 'rejected';

interface SimEvent {
  id: number;
  type: 'enter_step' | 'create_task' | 'task_outcome' | 'validation' | 'validation_outcome' | 'action' | 'transition' | 'end';
  label: string;
  detail?: string;
  stepKey?: string;
  icon: 'step' | 'task' | 'check' | 'action' | 'arrow' | 'end';
}

export function WfSimulation({ steps, transitions, actions, taskConfigs, validationConfigs }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [pendingChoice, setPendingChoice] = useState<null | {
    type: 'task_outcome';
    task: WfTaskConfig;
  } | {
    type: 'validation_outcome';
    validation: WfValidationConfig;
    sourceTask?: WfTaskConfig;
  } | {
    type: 'transition_choice';
    transitions: WfTransition[];
    stepName: string;
  }>(null);
  const [currentStepKey, setCurrentStepKey] = useState<string | null>(null);
  const [eventCounter, setEventCounter] = useState(0);

  const activeSteps = useMemo(() => steps.filter(s => s.is_active).sort((a, b) => a.order_index - b.order_index), [steps]);
  const startStep = activeSteps.find(s => s.step_type === 'start');

  const nextId = useCallback(() => {
    setEventCounter(c => c + 1);
    return eventCounter + 1;
  }, [eventCounter]);

  const getStep = (key: string) => steps.find(s => s.step_key === key);

  const addEvent = useCallback((ev: Omit<SimEvent, 'id'>) => {
    const newEvent = { ...ev, id: Date.now() + Math.random() };
    setEvents(prev => [...prev, newEvent as SimEvent]);
  }, []);

  const enterStep = useCallback((stepKey: string) => {
    const step = getStep(stepKey);
    if (!step) return;
    setCurrentStepKey(stepKey);

    addEvent({
      type: 'enter_step', label: `Entrée : ${step.name}`,
      detail: WF_STEP_TYPE_LABELS[step.step_type],
      stepKey, icon: 'step',
    });

    // End step
    if (step.step_type === 'end') {
      addEvent({ type: 'end', label: 'Workflow terminé', icon: 'end' });
      setPendingChoice(null);
      return;
    }

    // Entry actions
    const entryActions = actions.filter(a => a.step_key === stepKey && a.is_active && !a.transition_id);
    for (const a of entryActions) {
      addEvent({
        type: 'action', label: `Action : ${WF_ACTION_TYPE_LABELS[a.action_type]}`,
        detail: a.step_key ? `Étape ${step.name}` : undefined, icon: 'action',
      });
    }

    // Tasks for this step
    const stepTasks = taskConfigs
      .filter(t => t.step_key === stepKey && t.is_active && t.trigger_mode === 'on_step_entry')
      .sort((a, b) => a.order_index - b.order_index);

    if (stepTasks.length > 0) {
      for (const task of stepTasks) {
        addEvent({
          type: 'create_task', label: `Tâche créée : ${task.name}`,
          detail: `Exécutant : ${EXECUTOR_TYPE_LABELS[task.executor_type] || task.executor_type}`,
          icon: 'task',
        });
      }
      // Ask outcome for first task
      setPendingChoice({ type: 'task_outcome', task: stepTasks[0] });
    } else {
      // No tasks, check transitions
      proceedFromStep(stepKey);
    }
  }, [steps, taskConfigs, actions, addEvent]);

  const proceedFromStep = useCallback((stepKey: string) => {
    const outTransitions = transitions
      .filter(t => t.from_step_key === stepKey && t.is_active);

    if (outTransitions.length === 0) {
      addEvent({ type: 'end', label: 'Fin de branche (pas de transition)', icon: 'end' });
      setPendingChoice(null);
    } else if (outTransitions.length === 1) {
      const t = outTransitions[0];
      const toStep = getStep(t.to_step_key);
      addEvent({
        type: 'transition', label: `→ ${toStep?.name || t.to_step_key}`,
        detail: WF_EVENT_LABELS[t.event] || t.event, icon: 'arrow',
      });
      enterStep(t.to_step_key);
    } else {
      const stepName = getStep(stepKey)?.name || stepKey;
      setPendingChoice({ type: 'transition_choice', transitions: outTransitions, stepName });
    }
  }, [transitions, steps, addEvent, enterStep]);

  const handleTaskOutcome = useCallback((outcome: TaskOutcome) => {
    if (pendingChoice?.type !== 'task_outcome') return;
    const task = pendingChoice.task;

    const outcomeLabel = outcome === 'completed' ? 'Terminée' : outcome === 'refused' ? 'Refusée' : 'Annulée';
    addEvent({
      type: 'task_outcome', label: `${task.name} → ${outcomeLabel}`,
      icon: 'task',
    });

    // Check completion behavior
    if (outcome === 'completed') {
      if (task.completion_behavior === 'send_to_validation' || task.completion_behavior === 'wait_validation') {
        // Find linked validation
        const validation = task.validation_config_id
          ? validationConfigs.find(v => v.id === task.validation_config_id)
          : validationConfigs.find(v => v.source_task_key === task.task_key && v.is_active);

        if (validation) {
          addEvent({
            type: 'validation', label: `Validation : ${validation.name}`,
            detail: `Validateur : ${validation.validator_type}`, icon: 'check',
          });
          setPendingChoice({ type: 'validation_outcome', validation, sourceTask: task });
          return;
        }
      }

      if (task.completion_behavior === 'close_and_advance_step' || task.completion_behavior === 'close_and_goto_step') {
        const targetKey = task.completion_target_step_key || currentStepKey;
        if (targetKey) {
          addEvent({
            type: 'transition',
            label: `→ ${getStep(task.completion_target_step_key || '')?.name || 'étape suivante'}`,
            icon: 'arrow',
          });
          if (task.completion_target_step_key) {
            enterStep(task.completion_target_step_key);
          } else if (currentStepKey) {
            proceedFromStep(currentStepKey);
          }
          return;
        }
      }

      if (task.completion_behavior === 'close_task' || task.completion_behavior === 'stay_on_step') {
        addEvent({ type: 'task_outcome', label: `Tâche fermée`, icon: 'task' });
        // Check remaining tasks
        if (currentStepKey) {
          const remainingTasks = taskConfigs.filter(
            t => t.step_key === currentStepKey && t.is_active && t.task_key !== task.task_key && t.trigger_mode === 'on_step_entry'
          );
          if (remainingTasks.length > 0) {
            setPendingChoice({ type: 'task_outcome', task: remainingTasks[0] });
            return;
          }
          proceedFromStep(currentStepKey);
        }
        return;
      }
    }

    // Default: proceed from step
    if (currentStepKey) proceedFromStep(currentStepKey);
  }, [pendingChoice, currentStepKey, taskConfigs, validationConfigs, addEvent, enterStep, proceedFromStep]);

  const handleValidationOutcome = useCallback((outcome: ValidationOutcome) => {
    if (pendingChoice?.type !== 'validation_outcome') return;
    const { validation, sourceTask } = pendingChoice;

    addEvent({
      type: 'validation_outcome',
      label: `${validation.name} → ${outcome === 'approved' ? 'Validé' : 'Refusé'}`,
      icon: 'check',
    });

    if (outcome === 'approved') {
      const effect = validation.on_approved_effect;
      if (effect === 'goto_step' && validation.on_approved_target_step_key) {
        enterStep(validation.on_approved_target_step_key);
        return;
      }
      if (effect === 'advance_step' && currentStepKey) {
        proceedFromStep(currentStepKey);
        return;
      }
    } else {
      const effect = validation.on_rejected_effect;
      if (effect === 'goto_step' && validation.on_rejected_target_step_key) {
        enterStep(validation.on_rejected_target_step_key);
        return;
      }
      if (effect === 'return_to_task' && sourceTask) {
        addEvent({ type: 'task_outcome', label: `Retour à la tâche : ${sourceTask.name}`, icon: 'task' });
        setPendingChoice({ type: 'task_outcome', task: sourceTask });
        return;
      }
    }

    if (currentStepKey) proceedFromStep(currentStepKey);
  }, [pendingChoice, currentStepKey, addEvent, enterStep, proceedFromStep]);

  const handleTransitionChoice = useCallback((transitionId: string) => {
    if (pendingChoice?.type !== 'transition_choice') return;
    const t = pendingChoice.transitions.find(tr => tr.id === transitionId);
    if (!t) return;
    const toStep = getStep(t.to_step_key);
    addEvent({
      type: 'transition', label: `→ ${toStep?.name || t.to_step_key}`,
      detail: WF_EVENT_LABELS[t.event] || t.event, icon: 'arrow',
    });
    enterStep(t.to_step_key);
  }, [pendingChoice, addEvent, enterStep]);

  const startSimulation = () => {
    setEvents([]);
    setPendingChoice(null);
    setCurrentStepKey(null);
    setEventCounter(0);
    setIsRunning(true);
    if (startStep) {
      enterStep(startStep.step_key);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setEvents([]);
    setPendingChoice(null);
    setCurrentStepKey(null);
  };

  const EVENT_ICONS: Record<SimEvent['icon'], { component: typeof Circle; color: string }> = {
    step: { component: ChevronRight, color: 'text-primary' },
    task: { component: ListTodo, color: 'text-orange-600' },
    check: { component: Shield, color: 'text-blue-600' },
    action: { component: Zap, color: 'text-amber-600' },
    arrow: { component: ArrowRight, color: 'text-muted-foreground' },
    end: { component: CheckCircle, color: 'text-green-600' },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              Simulation du workflow
            </CardTitle>
            <CardDescription className="mt-1">
              Testez le comportement logique du workflow pas à pas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isRunning && (
              <Button variant="outline" size="sm" onClick={reset} className="gap-1 h-7 text-xs">
                <RotateCcw className="h-3 w-3" /> Réinitialiser
              </Button>
            )}
            {!isRunning && (
              <Button size="sm" onClick={startSimulation} disabled={!startStep} className="gap-1 h-7 text-xs">
                <Play className="h-3 w-3" /> Démarrer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isRunning && events.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Lancez la simulation pour tester le flux du workflow.</p>
            {!startStep && (
              <p className="text-red-500 mt-2 text-xs">Aucune étape de départ trouvée.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event log */}
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-1">
                {events.map((ev, idx) => {
                  const iconCfg = EVENT_ICONS[ev.icon];
                  const Icon = iconCfg.component;
                  return (
                    <div key={ev.id} className="flex items-start gap-2.5 py-1.5">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          ev.type === 'enter_step' ? 'bg-primary/10' :
                          ev.type === 'end' ? 'bg-green-100' :
                          'bg-muted/50'
                        }`}>
                          <Icon className={`h-3 w-3 ${iconCfg.color}`} />
                        </div>
                        {idx < events.length - 1 && <div className="w-px h-3 bg-border mt-0.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${ev.type === 'enter_step' ? 'text-primary' : ev.type === 'end' ? 'text-green-700' : ''}`}>
                          {ev.label}
                        </p>
                        {ev.detail && (
                          <p className="text-[10px] text-muted-foreground">{ev.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Pending decision */}
            {pendingChoice && (
              <>
                <Separator />
                <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  {pendingChoice.type === 'task_outcome' && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Résultat de la tâche : {pendingChoice.task.name}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleTaskOutcome('completed')}>
                          <CheckCircle className="h-3 w-3" /> Terminée
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleTaskOutcome('refused')}>
                          <XCircle className="h-3 w-3" /> Refusée
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleTaskOutcome('cancelled')}>
                          Annulée
                        </Button>
                      </div>
                    </div>
                  )}

                  {pendingChoice.type === 'validation_outcome' && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Décision du validateur : {pendingChoice.validation.name}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleValidationOutcome('approved')}>
                          <CheckCircle className="h-3 w-3" /> Validé
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleValidationOutcome('rejected')}>
                          <XCircle className="h-3 w-3" /> Refusé
                        </Button>
                      </div>
                    </div>
                  )}

                  {pendingChoice.type === 'transition_choice' && (
                    <div>
                      <p className="text-xs font-semibold mb-2">
                        Transitions depuis "{pendingChoice.stepName}" :
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {pendingChoice.transitions.map(t => {
                          const toStep = steps.find(s => s.step_key === t.to_step_key);
                          return (
                            <Button key={t.id} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleTransitionChoice(t.id)}>
                              <ArrowRight className="h-3 w-3" />
                              {WF_EVENT_LABELS[t.event] || t.event} → {toStep?.name || t.to_step_key}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
