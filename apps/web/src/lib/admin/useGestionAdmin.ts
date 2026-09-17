import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

export interface UsuarioSistema {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string | null;
  estado: string;
  roles: { codigo: string; nombre: string }[];
  empresa: { razonSocial: string; rnc: string } | null;
  fechaCreacion: string;
}

export interface TipoEstablecimientoAdmin {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fechaCreacion: string;
}

export function useUsuariosTodos() {
  return useQuery({
    queryKey: ['admin', 'usuarios-todos'],
    queryFn: () => apiFetchJson<UsuarioSistema[]>('/api/v1/usuarios/todos'),
  });
}

export function useActualizarRolUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rolCodigo }: { id: string; rolCodigo: string }) =>
      apiFetchJson<{ mensaje: string; rol: string }>(`/api/v1/usuarios/${id}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolCodigo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios-todos'] });
    },
  });
}

export function useActualizarEstadoUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      apiFetchJson<{ id: string; estado: string; mensaje: string }>(`/api/v1/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios-todos'] });
    },
  });
}

export function useTiposEstablecimientoAdmin() {
  return useQuery({
    queryKey: ['admin', 'tipos-establecimiento'],
    queryFn: () => apiFetchJson<TipoEstablecimientoAdmin[]>('/api/v1/catalogos/tipos-establecimiento?todos=true'),
  });
}

export function useCrearTipoEstablecimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { nombre: string; descripcion?: string }) =>
      apiFetchJson<TipoEstablecimientoAdmin>('/api/v1/catalogos/tipos-establecimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tipos-establecimiento'] });
      queryClient.invalidateQueries({ queryKey: ['tipos-establecimiento'] });
    },
  });
}

export function useActualizarTipoEstablecimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...datos }: { id: number; nombre?: string; descripcion?: string; activo?: boolean }) =>
      apiFetchJson<TipoEstablecimientoAdmin>(`/api/v1/catalogos/tipos-establecimiento/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tipos-establecimiento'] });
      queryClient.invalidateQueries({ queryKey: ['tipos-establecimiento'] });
    },
  });
}
