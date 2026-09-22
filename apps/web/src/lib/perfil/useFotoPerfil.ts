import { useState, useEffect, useCallback } from 'react';

const EVENTO_FOTO = 'foto-perfil:cambiada';

function almacenamiento(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function guardarFotoPerfil(usuarioId: string, base64: string | null) {
  const clave = `avatar_img_${usuarioId}`;
  const storage = almacenamiento();
  if (base64) {
    storage?.setItem(clave, base64);
  } else {
    storage?.removeItem(clave);
  }
  window.dispatchEvent(new CustomEvent(EVENTO_FOTO, { detail: { usuarioId, base64 } }));
}

export function useFotoPerfil(usuarioId?: string | null): [string | null, (base64: string | null) => void] {
  const [fotoUrl, setFotoUrl] = useState<string | null>(() => {
    if (!usuarioId) return null;
    return almacenamiento()?.getItem(`avatar_img_${usuarioId}`) ?? null;
  });

  useEffect(() => {
    if (!usuarioId) {
      setFotoUrl(null);
      return;
    }
    setFotoUrl(almacenamiento()?.getItem(`avatar_img_${usuarioId}`) ?? null);

    const handleCambio = (e: Event) => {
      const customEvent = e as CustomEvent<{ usuarioId: string; base64: string | null }>;
      if (customEvent.detail && customEvent.detail.usuarioId === usuarioId) {
        setFotoUrl(customEvent.detail.base64);
      }
    };

    window.addEventListener(EVENTO_FOTO, handleCambio);
    return () => window.removeEventListener(EVENTO_FOTO, handleCambio);
  }, [usuarioId]);

  const actualizarFoto = useCallback(
    (base64: string | null) => {
      if (usuarioId) {
        guardarFotoPerfil(usuarioId, base64);
      }
    },
    [usuarioId]
  );

  return [fotoUrl, actualizarFoto];
}
