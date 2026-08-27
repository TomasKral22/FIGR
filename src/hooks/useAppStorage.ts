import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appStorage } from '@/lib/appStorage';

export function useAppStorage() {
  const { session } = useAuth();
  return useMemo(() => appStorage.forUser(session?.user.id ?? null), [session?.user.id]);
}
