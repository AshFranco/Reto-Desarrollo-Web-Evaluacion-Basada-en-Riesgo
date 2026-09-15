import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/auth/session';
import type { PerfilUsuario } from '@/lib/types';

async function fetchPerfil(): Promise<PerfilUsuario> {
  const sesion = await getSession();
  const res = await fetch('/api/v1/usuarios/perfil', {
    headers: { Authorization: `Bearer ${sesion?.accessToken ?? ''}` },
  });
  if (!res.ok) throw new Error('Error al cargar el perfil.');
  return res.json() as Promise<PerfilUsuario>;
}

/**
 * Hook para obtener los datos del perfil del usuario autenticado.
 * Usa React Query con staleTime de 5 minutos para evitar peticiones
 * innecesarias al abrir el modal repetidamente.
 */
export function usePerfil() {
  const { data, isLoading, error, refetch } = useQuery<PerfilUsuario, Error>({
    queryKey: ['perfil-usuario'],
    queryFn: fetchPerfil,
    staleTime: 1000 * 60 * 5,
  });

  return { perfil: data ?? null, cargando: isLoading, error, refetch };
}
