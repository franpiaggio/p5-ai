import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSketches,
  createSketch,
  updateSketch,
  deleteSketch,
} from '../services/api';
import { queryKeys } from './queryClient';
import type { SketchSummary } from '../types';

export function useSketches(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sketches,
    queryFn: getSketches,
    enabled,
  });
}

export function useCreateSketch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSketch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sketches });
    },
  });
}

export function useUpdateSketch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Parameters<typeof updateSketch>[1] & { id: string }) =>
      updateSketch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sketches });
    },
  });
}

export function useDeleteSketch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSketch,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.sketches });
      const previous = qc.getQueryData<SketchSummary[]>(queryKeys.sketches);
      qc.setQueryData<SketchSummary[]>(queryKeys.sketches, (old) =>
        old?.filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.sketches, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sketches });
    },
  });
}
