import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { syncProcessor } from './processor';

export interface SyncStatus {
  enLinea: boolean;
  pendientes: number;
  sincronizando: boolean;
  ultimaSync: number | null;
  sincronizar: () => void;
}

export function useSyncStatus(): SyncStatus {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<number | null>(null);

  const contarPendientes = useCallback(async () => {
    const n = await db.cola_sync.where('estado').equals('pendiente').count();
    setPendientes(n);
  }, []);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      await syncProcessor.procesarCola(true);
      setUltimaSync(Date.now());
    } finally {
      setSincronizando(false);
      await contarPendientes();
    }
  }, [contarPendientes]);

  useEffect(() => {
    void contarPendientes();
    const id = setInterval(contarPendientes, 5_000);
    const online = () => { setEnLinea(true); void sincronizar(); };
    const offline = () => setEnLinea(false);
    const alActualizar = () => { void contarPendientes(); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('sync:actualizado', alActualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('sync:actualizado', alActualizar);
    };
  }, [contarPendientes, sincronizar]);

  return { enLinea, pendientes, sincronizando, ultimaSync, sincronizar };
}
