import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviderKeys, saveProviderKey, clearProviderKey } from '../services/api';
import { queryKeys } from './queryClient';

export function useProviderKeysQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.providerKeys,
    queryFn: getProviderKeys,
    enabled,
    staleTime: Infinity,
  });
}

export function useSaveProviderKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      saveProviderKey(provider, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.providerKeys });
    },
  });
}

export function useClearProviderKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearProviderKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.providerKeys });
    },
  });
}
