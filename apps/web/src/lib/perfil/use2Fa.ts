import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/lib/auth/session';

export interface DatosGeneracion2Fa {
  secreto: string;
  qrCode: string;
  otpauthUrl: string;
  correo: string;
  dobleFactorActivo: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function obtenerHeaders(): Promise<HeadersInit> {
  const sesion = await getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sesion?.accessToken ?? ''}`,
  };
}

export async function generarQr2Fa(): Promise<DatosGeneracion2Fa> {
  const headers = await obtenerHeaders();
  const res = await fetch(`${API_BASE}/api/v1/usuarios/perfil/2fa/generar`, {
    method: 'POST',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al generar la configuración de 2FA.');
  }
  return data as DatosGeneracion2Fa;
}

export async function confirmarActivacion2Fa(payload: { secreto: string; codigo: string }): Promise<{ ok: boolean; mensaje: string }> {
  const headers = await obtenerHeaders();
  const res = await fetch(`${API_BASE}/api/v1/usuarios/perfil/2fa/activar`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al verificar el código de dos pasos.');
  }
  return data;
}

export async function confirmarDesactivacion2Fa(payload: { contrasenaActual: string }): Promise<{ ok: boolean; mensaje: string }> {
  const headers = await obtenerHeaders();
  const res = await fetch(`${API_BASE}/api/v1/usuarios/perfil/2fa/desactivar`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al desactivar la verificación en dos pasos.');
  }
  return data;
}

export function use2Fa() {
  const queryClient = useQueryClient();

  const mutacionActivar = useMutation({
    mutationFn: confirmarActivacion2Fa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil-usuario'] });
    },
  });

  const mutacionDesactivar = useMutation({
    mutationFn: confirmarDesactivacion2Fa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil-usuario'] });
    },
  });

  return {
    generarQr: generarQr2Fa,
    activar: mutacionActivar.mutateAsync,
    estaActivando: mutacionActivar.isPending,
    errorActivar: mutacionActivar.error?.message ?? null,
    desactivar: mutacionDesactivar.mutateAsync,
    estaDesactivando: mutacionDesactivar.isPending,
    errorDesactivar: mutacionDesactivar.error?.message ?? null,
  };
}
