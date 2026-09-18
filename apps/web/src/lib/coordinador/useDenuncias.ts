import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

/**
 * Forma confirmada contra denuncias.service.ts (serializar()). IMPORTANTE:
 * no existe ningún campo `esAnonima`/`es_anonima` -- ni en el DTO
 * (CrearDenunciaDto), ni en el servicio, ni en el modelo Prisma `Denuncia`
 * (confirmado leyendo schema.prisma). El anonimato se logra simplemente
 * omitiendo `denunciante` (campo opcional) -- no hay un flag dedicado.
 * También confirmado: `POST /denuncias` es @Public() (denuncias.controller.ts),
 * pensado para el portal ciudadano sin login; esta pantalla la usa un
 * ADMINISTRADOR/COORDINADOR ya autenticado para registrar denuncias que
 * llegan por otro canal (teléfono, presencial), así que igual manda el
 * token -- el backend lo acepta también con sesión, @Public() solo la
 * habilita además sin ella.
 */
export interface Denuncia {
  id: string;
  tipoDenuncia: string | null;
  fechaRecepcion: string;
  denunciante: string | null;
  descripcion: string | null;
  idEmpresa: string | null;
  idEstablecimiento: string | null;
  resultado: 'PROCEDE' | 'NO_PROCEDE' | 'REMISION' | null;
}

/** DTO confirmado contra CrearDenunciaDto -- solo fechaRecepcion es obligatoria. */
export interface DatosDenuncia {
  tipoDenuncia?: string;
  fechaRecepcion: string;
  denunciante?: string;
  descripcion?: string;
  empresaId?: string;
  establecimientoId?: string;
}

/** GET /api/v1/denuncias -- @Roles(ADMINISTRADOR, COORDINADOR), sin filtros de query. */
export function useDenuncias() {
  return useQuery({
    queryKey: ['denuncias'],
    queryFn: () => apiFetchJson<Denuncia[]>('/api/v1/denuncias'),
  });
}

export function useCrearDenuncia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosDenuncia) =>
      apiFetchJson<Denuncia>('/api/v1/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['denuncias'] }),
  });
}

/**
 * PATCH /denuncias/:id/resolver -- mismo comportamiento que alertas: PROCEDE
 * exige idEstablecimiento ya asociado y crea el Caso automáticamente
 * (origen "DENUNCIA"). REMISION no crea caso (solo PROCEDE lo hace, según
 * denuncias.service.ts).
 */
export function useResolverDenuncia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resultado }: { id: string; resultado: 'PROCEDE' | 'NO_PROCEDE' | 'REMISION' }) =>
      apiFetchJson<Denuncia>(`/api/v1/denuncias/${id}/resolver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denuncias'] });
      queryClient.invalidateQueries({ queryKey: ['casos'] });
    },
  });
}
