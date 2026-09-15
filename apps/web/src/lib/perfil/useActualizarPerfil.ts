import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/lib/auth/session';
import type { PerfilUsuario } from '@/lib/types';

export interface ActualizarPerfilPayload {
  nombreCompleto?: string;
  telefono?: string;
  dobleFactorActivo?: boolean;
}

async function patchPerfil(payload: ActualizarPerfilPayload): Promise<PerfilUsuario> {
  const sesion = await getSession();
  const res = await fetch('/api/v1/usuarios/perfil', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesion?.accessToken ?? ''}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al actualizar el perfil.');
  }
  return res.json() as Promise<PerfilUsuario>;
}

export function useActualizarPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchPerfil,
    onSuccess: (nuevoPerfil) => {
      queryClient.setQueryData(['perfil-usuario', nuevoPerfil.id], nuevoPerfil);
      queryClient.setQueryData(['perfil-usuario'], nuevoPerfil);
      queryClient.invalidateQueries({ queryKey: ['perfil-usuario'] });
    },
  });
}
