/**
 * Thin wrapper — all data comes from the shared TeamHierarchyContext.
 * No Supabase queries are issued here; the provider fetches once globally.
 */
import { useTeamHierarchyContext } from '@/contexts/TeamHierarchyContext';

export type { TeamMember, HierarchyNode } from '@/contexts/TeamHierarchyContext';

export function useTeamHierarchy() {
  return useTeamHierarchyContext();
}
