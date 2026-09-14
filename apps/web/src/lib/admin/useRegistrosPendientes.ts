import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

export interface UsuarioPendiente {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  fechaCreacion: string;
  roles: string[];
}

export function useRegistrosPendientes() {
  return useQuery({
    queryKey: ['usuarios', 'registros', 'pendientes'],
    queryFn: () => apiFetchJson<UsuarioPendiente[]>('/api/v1/usuarios/registros/pendientes'),
  });
}

export function useResolverRegistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      motivoRechazo,
    }: {
      id: string;
      decision: 'APROBADO' | 'RECHAZADO';
      motivoRechazo?: string;
    }) =>
      apiFetchJson(`/api/v1/usuarios/registros/${id}/resolver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, motivoRechazo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios', 'registros', 'pendientes'] });
    },
  });
}
