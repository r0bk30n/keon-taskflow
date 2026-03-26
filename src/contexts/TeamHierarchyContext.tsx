/**
 * TeamHierarchyContext
 * Runs the expensive hierarchy RPC + enrichment ONCE globally.
 * All calls to useTeamHierarchy() share the same data with no extra fetch.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
// Types defined here to avoid circular imports (hook imports from context)
export interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  job_title_id: string | null;
  department: string | null;
  department_id: string | null;
  company: string | null;
  company_id: string | null;
  manager_id: string | null;
  hierarchy_level_id: string | null;
  permission_profile_id?: string | null;
  hierarchy_level?: { id: string; name: string; level: number } | null;
  job_title_info?: { id: string; name: string } | null;
  department_info?: { id: string; name: string } | null;
}

export interface HierarchyNode extends TeamMember {
  subordinates: HierarchyNode[];
  isCurrentUser: boolean;
  relationToUser: 'self' | 'manager' | 'subordinate' | 'peer' | 'other';
}

interface TeamHierarchyContextValue {
  allMembers: TeamMember[];
  hierarchyTree: HierarchyNode | null;
  managers: TeamMember[];
  subordinates: TeamMember[];
  peers: TeamMember[];
  isLoading: boolean;
  refetch: () => void;
}

const TeamHierarchyContext = createContext<TeamHierarchyContextValue | undefined>(undefined);

export function TeamHierarchyProvider({ children }: { children: ReactNode }) {
  const { profile: authProfile } = useAuth();
  const { isSimulating, simulatedProfile } = useSimulation();

  const profile = isSimulating && simulatedProfile ? simulatedProfile : authProfile;

  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode | null>(null);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [subordinates, setSubordinates] = useState<TeamMember[]>([]);
  const [peers, setPeers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeamData = useCallback(async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: members, error } = await supabase.rpc('get_all_profiles_for_hierarchy');
      if (error || !members || members.length === 0) {
        if (error) console.error('[TeamHierarchyContext]', error);
        return;
      }

      // Batch-load related data
      const [levelsRes, jobTitlesRes, deptsRes] = await Promise.all([
        supabase.from('hierarchy_levels').select('id, name, level'),
        supabase.from('job_titles').select('id, name'),
        supabase.from('departments').select('id, name'),
      ]);

      const enriched: TeamMember[] = members.map(m => ({
        ...m,
        hierarchy_level: levelsRes.data?.find(l => l.id === m.hierarchy_level_id) ?? null,
        job_title_info: jobTitlesRes.data?.find(j => j.id === m.job_title_id) ?? null,
        department_info: deptsRes.data?.find(d => d.id === m.department_id) ?? null,
      }));

      setAllMembers(enriched);

      // --- Managers chain ---
      const managersList: TeamMember[] = [];
      const visitedManagers = new Set<string>();
      let cur = enriched.find(m => m.id === profile.manager_id);
      while (cur) {
        if (visitedManagers.has(cur.id) || managersList.length >= 50) break;
        visitedManagers.add(cur.id);
        managersList.push(cur);
        if (!cur.manager_id || cur.manager_id === cur.id) break;
        cur = enriched.find(m => m.id === cur!.manager_id);
      }
      setManagers(managersList);

      // --- Subordinates (recursive) ---
      const findSubs = (managerId: string, visited: Set<string> = new Set()): TeamMember[] => {
        if (visited.has(managerId)) return [];
        visited.add(managerId);
        const direct = enriched.filter(m => m.manager_id === managerId && !visited.has(m.id));
        return [...direct, ...direct.flatMap(s => findSubs(s.id, visited))];
      };
      const userSubs = findSubs(profile.id);
      setSubordinates(userSubs);

      // --- Peers ---
      if (profile.manager_id) {
        setPeers(enriched.filter(m => m.manager_id === profile.manager_id && m.id !== profile.id));
      } else {
        setPeers([]);
      }

      // --- Hierarchy tree ---
      const buildTree = (member: TeamMember, pool: TeamMember[], visited = new Set<string>()): HierarchyNode => {
        if (visited.has(member.id)) {
          return { ...member, subordinates: [], isCurrentUser: member.id === profile.id, relationToUser: 'other' };
        }
        visited.add(member.id);

        let rel: HierarchyNode['relationToUser'] = 'other';
        if (member.id === profile.id) rel = 'self';
        else if (managersList.some(m => m.id === member.id)) rel = 'manager';
        else if (userSubs.some(s => s.id === member.id)) rel = 'subordinate';
        else if (profile.manager_id && member.manager_id === profile.manager_id) rel = 'peer';

        const directSubs = pool.filter(m => m.manager_id === member.id && m.id !== member.id && !visited.has(m.id));
        return {
          ...member,
          subordinates: directSubs.map(s => buildTree(s, pool, new Set(visited))),
          isCurrentUser: member.id === profile.id,
          relationToUser: rel,
        };
      };

      // Check if admin (can_view_all_tasks) to decide tree root
      const currentMember = members.find(m => m.id === profile.id) as TeamMember | undefined;
      let isAdmin = false;
      if (currentMember?.permission_profile_id) {
        const { data: pp } = await supabase
          .from('permission_profiles')
          .select('can_view_all_tasks')
          .eq('id', currentMember.permission_profile_id)
          .maybeSingle();
        isAdmin = !!pp?.can_view_all_tasks;
      }

      if (isAdmin) {
        const roots = enriched.filter(
          m => !m.manager_id || m.manager_id === m.id || !enriched.some(o => o.id === m.manager_id)
        );
        if (roots.length > 0) {
          setHierarchyTree({
            id: 'virtual-root',
            user_id: '',
            display_name: 'Organisation',
            avatar_url: null,
            job_title: null,
            job_title_id: null,
            department: null,
            department_id: null,
            company: null,
            company_id: null,
            manager_id: null,
            hierarchy_level_id: null,
            hierarchy_level: null,
            job_title_info: null,
            department_info: null,
            subordinates: roots.map(m => buildTree(m, enriched, new Set())),
            isCurrentUser: false,
            relationToUser: 'other',
          });
        }
      } else {
        const rootMember = managersList.length > 0
          ? managersList[managersList.length - 1]
          : enriched.find(m => m.id === profile.id);
        if (rootMember) setHierarchyTree(buildTree(rootMember, enriched, new Set()));
      }
    } catch (err) {
      console.error('[TeamHierarchyContext] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.manager_id, profile?.permission_profile_id]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const value = useMemo<TeamHierarchyContextValue>(() => ({
    allMembers,
    hierarchyTree,
    managers,
    subordinates,
    peers,
    isLoading,
    refetch: fetchTeamData,
  }), [allMembers, hierarchyTree, managers, subordinates, peers, isLoading, fetchTeamData]);

  return (
    <TeamHierarchyContext.Provider value={value}>
      {children}
    </TeamHierarchyContext.Provider>
  );
}

export function useTeamHierarchyContext(): TeamHierarchyContextValue {
  const ctx = useContext(TeamHierarchyContext);
  if (!ctx) throw new Error('useTeamHierarchyContext must be used within <TeamHierarchyProvider>');
  return ctx;
}
