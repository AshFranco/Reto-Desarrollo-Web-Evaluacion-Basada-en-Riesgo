import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/auth/session';
import { apiFetchJson } from '@/lib/http/client';
import type { PerfilUsuario } from '@/lib/types';

async function fetchPerfil(usuarioIdEsperado?: string | null): Promise<PerfilUsuario> {
  const sesion = await getSession();
  if (usuarioIdEsperado && sesion?.usuario?.id && String(sesion.usuario.id) !== String(usuarioIdEsperado)) {
    throw new Error('Discrepancia de sesión detectada.');
  }
  const data = await apiFetchJson<PerfilUsuario>('/api/v1/usuarios/perfil');
  if (usuarioIdEsperado && data?.id && String(data.id) !== String(usuarioIdEsperado)) {
    throw new Error('Discrepancia de perfil detectada.');
  }
  return data;
}

/**
 * Hook para obtener los datos del perfil del usuario autenticado.
 * Aísla la clave de caché por usuarioId para evitar que al cambiar de cuenta
 * se muestren los datos del usuario anterior. staleTime se fija en 0 para
 * garantizar que siempre consulte el perfil fresco.
 */
export function usePerfil(usuarioId?: string | null) {
  const { data, isLoading, error, refetch } = useQuery<PerfilUsuario, Error>({
    queryKey: usuarioId ? ['perfil-usuario', usuarioId] : ['perfil-usuario'],
    queryFn: () => fetchPerfil(usuarioId),
    staleTime: 0,
  });

  return { perfil: data ?? null, cargando: isLoading, error, refetch };
}
