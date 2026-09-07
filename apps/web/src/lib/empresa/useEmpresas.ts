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
 * POST /empresas: confirmado en vivo que ahora también acepta
 * ADMINISTRADOR_EMPRESA y USUARIO_DELEGADO, no solo ADMINISTRADOR/
 * COORDINADOR (empresas.controller.ts). Cuando lo llama un rol de empresa
 * sin empresaId todavía, el backend vincula la empresa creada a ese
 * usuario automáticamente (empresas.service.ts) — por eso DashboardEmpresa
 * no manda ningún id ni hace nada especial después del alta.
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
