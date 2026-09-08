import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';

/** Forma confirmada en vivo contra GET /api/v1/usuarios/por-rol/:codigoRol. */
export interface UsuarioPorRol {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
}

/**
 * GET /api/v1/usuarios/por-rol/TECNICO_EVALUADOR — permitido para
 * ADMINISTRADOR y COORDINADOR (usuarios.controller.ts). Reemplaza el campo
 * de texto donde antes había que escribir el id del técnico a mano.
 */
export function useTecnicos() {
  return useQuery({
    queryKey: ['usuarios', 'por-rol', 'TECNICO_EVALUADOR'],
    queryFn: () => apiFetchJson<UsuarioPorRol[]>('/api/v1/usuarios/por-rol/TECNICO_EVALUADOR'),
  });
}
