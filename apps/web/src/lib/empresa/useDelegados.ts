import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '../http/client';

export interface Delegado {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  estado: 'APROBADO' | 'INACTIVO' | 'PENDIENTE_VALIDACION' | 'RECHAZADO';
  fechaCreacion: string;
}

export interface InvitarDelegadoPayload {
  nombreCompleto: string;
  correoElectronico: string;
  cedulaPasaporte: string;
}

export interface DelegadoInvitado extends Delegado {
  /** Solo viene en la respuesta de la invitación; no se puede recuperar después. */
  contrasenaTemporal: string;
}

export function useDelegados() {
  return useQuery({
    queryKey: ['delegados-empresa'],
    queryFn: () => apiFetchJson<Delegado[]>('/api/v1/empresas/delegados'),
  });
}

export function useInvitarDelegado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvitarDelegadoPayload) =>
      apiFetchJson<DelegadoInvitado>('/api/v1/empresas/delegados', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegados-empresa'] });
    },
  });
}

export function useCambiarEstadoDelegado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'APROBADO' | 'INACTIVO' }) =>
      apiFetchJson<{ id: string; estado: string }>(
        `/api/v1/empresas/delegados/${id}/estado`,
        {
          method: 'PATCH',
          body: JSON.stringify({ estado }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegados-empresa'] });
    },
  });
}
