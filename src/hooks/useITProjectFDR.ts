import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ITProjectFDRValidation, FDR_ETAPES } from '@/types/itProject';

export function useITProjectFDR(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['it-project-fdr-validation', projectId],
    queryFn: async (): Promise<ITProjectFDRValidation[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('it_project_fdr_validation')
        .select('*, valideur:profiles!it_project_fdr_validation_valideur_id_fkey(id,display_name)')
        .eq('it_project_id', projectId)
        .order('etape', { ascending: true });
      if (error) throw error;
      return (data as unknown as ITProjectFDRValidation[]) || [];
    },
    enabled: !!projectId,
  });

  const initFDRValidation = async () => {
    if (!projectId) return;
    const rows = FDR_ETAPES.map(e => ({
      it_project_id: projectId,
      etape: e.numero,
      etape_label: e.label,
      statut: 'a_faire' as const,
    }));
    const { error } = await supabase.from('it_project_fdr_validation').insert(rows);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['it-project-fdr-validation', projectId] });
  };

  const updateEtape = async (id: string, updates: Partial<Pick<ITProjectFDRValidation, 'statut' | 'date_validation' | 'commentaire' | 'valideur_id'>>) => {
    const { error } = await supabase
      .from('it_project_fdr_validation')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['it-project-fdr-validation', projectId] });
  };

  const etapeCourante = query.data
    ? Math.max(0, ...query.data.filter(e => e.statut === 'valide').map(e => e.etape))
    : 0;

  return { etapes: query.data || [], isLoading: query.isLoading, initFDRValidation, updateEtape, etapeCourante };
}
