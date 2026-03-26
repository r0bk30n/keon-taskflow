/**
 * Thin wrapper — all data comes from the shared PermissionsContext.
 * No Supabase queries are issued here; the provider fetches once globally.
 */
import { usePermissionsContext } from '@/contexts/PermissionsContext';

export function useEffectivePermissions() {
  return usePermissionsContext();
}
