import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../http/api';
import type { Notificacion } from '../types';

export function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const { data } = await api.get<Notificacion[]>('/api/v1/notificaciones/mias');
      return data;
    },
    // Poll every 60 seconds to keep the bell updated without reloading
    refetchInterval: 60 * 1000,
  });
}

export function useMarcarLeida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<Notificacion>(`/api/v1/notificaciones/${id}/leer`);
      return data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });
      const previous = queryClient.getQueryData<Notificacion[]>(['notificaciones']);
      
      // Optimistic update: mark as read immediately
      if (previous) {
        queryClient.setQueryData<Notificacion[]>(
          ['notificaciones'],
          previous.map((n) => (n.id === id ? { ...n, leida: true } : n))
        );
      }
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}
