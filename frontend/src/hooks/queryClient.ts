import { QueryClient } from '@tanstack/react-query';

/** Default time before cached data is considered stale */
const DEFAULT_STALE_TIME_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  sketches: ['sketches'] as const,
  models: (provider: string, apiKey: string) => ['models', provider, apiKey] as const,
  providerKeys: ['providerKeys'] as const,
};
