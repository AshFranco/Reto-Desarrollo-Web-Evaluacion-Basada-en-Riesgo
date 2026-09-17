import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getSession } from '@/lib/auth/session';

interface CambiarContrasenaPayload {
  contrasenaActual: string;
  contrasenaNueva: string;
  confirmacion: string;
}

async function patchContrasena(payload: CambiarContrasenaPayload): Promise<{ mensaje: string }> {
  const sesion = await getSession();
  const res = await fetch('/api/v1/usuarios/perfil/contrasena', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesion?.accessToken ?? ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { mensaje?: string; message?: string | string[] };
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join('. ')
      : (data.message ?? 'Error al cambiar la contraseña.');
    throw new Error(msg);
  }
  return data as { mensaje: string };
}

/**
 * Hook para cambiar la contraseña del usuario autenticado.
 * Llama a PATCH /api/v1/usuarios/perfil/contrasena.
 * Al tener éxito, el backend revoca los refresh tokens en todos los dispositivos.
 */
export function useCambiarContrasena() {
  const [exito, setExito] = useState(false);

  const mutation = useMutation<{ mensaje: string }, Error, CambiarContrasenaPayload>({
    mutationFn: patchContrasena,
    onSuccess: () => setExito(true),
    onError: () => setExito(false),
  });

  function resetExito() {
    setExito(false);
  }

  return {
    cambiar: mutation.mutate,
    cargando: mutation.isPending,
    error: mutation.error?.message ?? null,
    exito,
    resetExito,
    reset: mutation.reset,
  };
}
