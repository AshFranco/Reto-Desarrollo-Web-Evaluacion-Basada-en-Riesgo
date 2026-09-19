const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Campos confirmados de nuevo contra CrearDenunciaDto
 * (apps/api/src/modules/denuncias/dto/denuncia.dto.ts): solo fechaRecepcion
 * es obligatoria, el resto opcional. Sigue sin existir `esAnonima` -- ni en
 * el DTO, ni en denuncias.service.ts, ni en el modelo Prisma `Denuncia`. El
 * anonimato se logra omitiendo `denunciante`, igual que en la pantalla
 * interna de coordinador (pages/coordinador/Denuncias.tsx).
 */
export interface DatosDenunciaPublica {
  tipoDenuncia?: string;
  fechaRecepcion: string;
  denunciante?: string;
  descripcion?: string;
  empresaId?: string;
  establecimientoId?: string;
}

/** Forma confirmada contra denuncias.service.ts#serializar(). No hay un campo de "número de referencia" separado -- `id` es lo único que identifica la denuncia. */
export interface DenunciaPublicaResponse {
  id: string;
  tipoDenuncia: string | null;
  fechaRecepcion: string;
  denunciante: string | null;
  descripcion: string | null;
  idEmpresa: string | null;
  idEstablecimiento: string | null;
  resultado: string | null;
}

/**
 * POST /api/v1/denuncias — ruta @Public() (denuncias.controller.ts), no
 * requiere sesión. Deliberadamente NO usa apiFetch/apiFetchJson (esos
 * agregan el Authorization automáticamente si hay una sesión guardada en
 * Dexie) -- esta pantalla puede abrirse sin haber iniciado sesión nunca, o
 * incluso con una sesión de otro rol abierta en el mismo navegador, y en
 * ningún caso debe mandar ese token. Mismo criterio honesto que
 * login.ts/registro.ts: el error del backend se propaga tal cual, sin
 * suavizarlo.
 */
export async function denunciaPublica(datos: DatosDenunciaPublica): Promise<DenunciaPublicaResponse> {
  const respuesta = await fetch(`${API_BASE}/api/v1/denuncias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(' ') : cuerpo?.message;
    throw new Error(mensaje ?? `Error al registrar la denuncia (${respuesta.status})`);
  }

  return respuesta.json();
}

/** Misma forma que EmpresaPublica en lib/empresa/useEmpresas.ts (GET /empresas/publicas). */
export interface EmpresaPublica {
  id: string;
  razonSocial: string;
  rnc: string;
  nombreComercial: string | null;
}

/**
 * GET /api/v1/empresas/publicas — también @Public(), sin sesión. Se
 * duplica este fetch en vez de reusar useEmpresasPublicas()
 * (lib/empresa/useEmpresas.ts) a propósito: ese hook pasa por
 * apiFetchJson, que adjunta el Authorization si hay CUALQUIER sesión
 * guardada en Dexie -- incluida la de otro rol abierta antes en el mismo
 * navegador. Esta pantalla no debe mandar ningún token bajo ninguna
 * circunstancia, así que usa fetch plano igual que denunciaPublica().
 */
export async function listarEmpresasPublicas(): Promise<EmpresaPublica[]> {
  const respuesta = await fetch(`${API_BASE}/api/v1/empresas/publicas`);

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(' ') : cuerpo?.message;
    throw new Error(mensaje ?? `Error al cargar las empresas (${respuesta.status})`);
  }

  return respuesta.json();
}
