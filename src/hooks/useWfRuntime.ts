import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WfRuntimeInstance, WfRuntimeLog } from '@/types/workflow';

interface WfEngineResponse {
  instance_id?: string;
  current_step_key?: string;
  state_label?: string;
  status?: string;
  message?: string;
  error?: string;
}

export function useWfRuntime() {
  const [isLoading, setIsLoading] = useState(false);
  const [instance, setInstance] = useState<WfRuntimeInstance | null>(null);
  const [logs, setLogs] = useState<WfRuntimeLog[]>([]);

  const callEngine = useCallback(async (body: Record<string, unknown>): Promise<WfEngineResponse | null> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return null;
      }

      const res = await supabase.functions.invoke('wf-engine', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        console.error('wf-engine error:', res.error);
        toast.error('Erreur moteur workflow');
        return null;
      }

      return res.data as WfEngineResponse;
    } catch (err) {
      console.error('wf-engine exception:', err);
      toast.error('Erreur moteur workflow');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startWorkflow = useCallback(async (
    demandId: string,
    subProcessTemplateId: string,
    contextData?: Record<string, unknown>,
  ) => {
    const result = await callEngine({
      action: 'start_workflow',
      demand_id: demandId,
      sub_process_template_id: subProcessTemplateId,
      context_data: contextData || {},
    });

    if (result?.instance_id) {
      toast.success('Workflow démarré');
      // Fetch fresh instance
      await fetchInstance(result.instance_id);
    }

    return result;
  }, [callEngine]);

  const fireEvent = useCallback(async (
    instanceId: string,
    event: string,
    payload?: Record<string, unknown>,
  ) => {
    const result = await callEngine({
      action: 'fire_event',
      instance_id: instanceId,
      event,
      payload: payload || {},
    });

    if (result?.status === 'completed') {
      toast.success('Workflow terminé');
    } else if (result?.status === 'advanced') {
      toast.success(`Avancé vers : ${result.state_label || result.current_step_key}`);
    } else if (result?.status === 'waiting') {
      toast.info(result.message || 'En attente de validations');
    }

    if (result?.instance_id) {
      await fetchInstance(result.instance_id);
    }

    return result;
  }, [callEngine]);

  const fetchInstance = useCallback(async (instanceIdOrDemandId: string) => {
    // Try by instance_id first, then by demand_id
    const result = await callEngine({
      action: 'get_instance',
      instance_id: instanceIdOrDemandId,
    });

    if (result && !result.error) {
      setInstance(result as unknown as WfRuntimeInstance);
    } else {
      // Try by demand_id
      const result2 = await callEngine({
        action: 'get_instance',
        demand_id: instanceIdOrDemandId,
      });
      if (result2 && !result2.error) {
        setInstance(result2 as unknown as WfRuntimeInstance);
      }
    }
  }, [callEngine]);

  const fetchLogs = useCallback(async (instanceId: string) => {
    const result = await callEngine({
      action: 'get_logs',
      instance_id: instanceId,
    });

    if (result && (result as any).logs) {
      setLogs((result as any).logs);
    }
  }, [callEngine]);

  return {
    isLoading,
    instance,
    logs,
    startWorkflow,
    fireEvent,
    fetchInstance,
    fetchLogs,
  };
}
