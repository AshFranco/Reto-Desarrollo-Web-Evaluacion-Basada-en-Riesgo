import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import type { Empresa } from '@/lib/types';

/**
 * DTO confirmado contra apps/api/src/modules/empresas/dto/empresa.dto.ts
 * (CrearEmpresaDto / ActualizarEmpresaDto, son el mismo shape).
 */
export interface DatosEmpresa {
  razonSocial: string;
  rnc: string;
  nombreComercial?: string;
  direccion?: string;
  idMunicipio?: string;
  telefono?: string;
  correo?: string;
  actividadEconomica?: string;
}

export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: () => apiFetchJson<Empresa[]>('/api/v1/empresas'),
  });
}

/** GET /empresas/:id — es el único que trae `establecimientos` incluidos. */
export function useEmpresa(id: string | null | undefined) {
  return useQuery({
    queryKey: ['empresas', id],
    queryFn: () => apiFetchJson<Empresa>(`/api/v1/empresas/${id}`),
    enabled: !!id,
  });
}

/**
 * POST /empresas exige rol ADMINISTRADOR o COORDINADOR en el backend — un
 * ADMINISTRADOR_EMPRESA o USUARIO_DELEGADO recibirá 403 si lo llama. Se
 * expone igual porque se pidió explícitamente, pero DashboardEmpresa.tsx
 * NO lo usa para "crear mi empresa" por esta razón — ver el aviso ahí.
 */
export function useCrearEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosEmpresa) =>
      apiFetchJson<Empresa>('/api/v1/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['empresas'] }),
  });
}

export function useEditarEmpresa(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosEmpresa) =>
      apiFetchJson<Empresa>(`/api/v1/empresas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresas', id] });
    },
  });
}
