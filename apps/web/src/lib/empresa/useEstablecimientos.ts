import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { Establecimiento } from '@/lib/types';

/**
 * DTO confirmado contra
 * apps/api/src/modules/establecimientos/dto/establecimiento.dto.ts
 * (CrearEstablecimientoDto / ActualizarEstablecimientoDto). Todos los
 * campos son opcionales salvo `nombre` — `empresaId` no se incluye acá
 * porque para ADMINISTRADOR_EMPRESA/USUARIO_DELEGADO el backend lo infiere
 * de `user.empresaId` (establecimientos.service.ts, crear()); ese campo
 * del DTO es solo para cuando lo crea un rol interno.
 */
export interface DatosEstablecimiento {
  nombre: string;
  rnc?: string;
  calle?: string;
  telefono?: string;
  correo?: string;
  fechaInicioOperaciones?: string;
  numeroPermisoSanitario?: string;
  fechaVencimientoPermiso?: string;
  produccionAnual?: number;
  empleadosMasculino?: number;
  empleadosFemenino?: number;
  mercadoObjetivo?: string;
}

/**
 * GET /establecimientos: para ADMINISTRADOR_EMPRESA/USUARIO_DELEGADO el
 * backend ya filtra automáticamente por la empresa del usuario (confirmado
 * en establecimientos.service.ts, listar()) — no hace falta mandar
 * empresaId desde acá.
 */
export function useEstablecimientos() {
  return useQuery({
    queryKey: ['establecimientos'],
    queryFn: () => apiFetchJson<Establecimiento[]>('/api/v1/establecimientos'),
  });
}

export function useEstablecimiento(id: string | null | undefined) {
  return useQuery({
    queryKey: ['establecimientos', id],
    queryFn: () => apiFetchJson<Establecimiento>(`/api/v1/establecimientos/${id}`),
    enabled: !!id,
  });
}

export function useCrearEstablecimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosEstablecimiento) =>
      apiFetchJson<Establecimiento>('/api/v1/establecimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['establecimientos'] }),
  });
}

export function useEditarEstablecimiento(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosEstablecimiento) =>
      apiFetchJson<Establecimiento>(`/api/v1/establecimientos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establecimientos'] });
      queryClient.invalidateQueries({ queryKey: ['establecimientos', id] });
    },
  });
}
