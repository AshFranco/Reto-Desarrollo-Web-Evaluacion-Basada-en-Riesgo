import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

/**
 * Forma confirmada en vivo contra GET /usuarios/registros/pendientes
 * (usuarios.service.ts#listarPendientesValidacion): además de nombre/correo,
 * el backend ya manda cedulaPasaporte, telefono y cartaAutorizacionUrl —
 * el propósito de RF-02 es que el admin revise esos datos (en particular
 * la carta) antes de aprobar o rechazar, no que apruebe a ciegas.
 */
export interface UsuarioPendiente {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  cedulaPasaporte: string;
  telefono: string | null;
  cartaAutorizacionUrl: string | null;
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
