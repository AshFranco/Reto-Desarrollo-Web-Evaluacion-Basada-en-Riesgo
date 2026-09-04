import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { SyncProcessor } from './processor';

export interface SyncStatus {
  enLinea: boolean;
  pendientes: number;
  sincronizando: boolean;
  ultimaSync: number | null;
  sincronizar: () => void;
}

const processor = new SyncProcessor();

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
      await processor.procesarCola();
      setUltimaSync(Date.now());
    } finally {
      setSincronizando(false);
      await contarPendientes();
    }
  }, [contarPendientes]);

  useEffect(() => {
    contarPendientes();
    const id = setInterval(contarPendientes, 5_000);
    const online = () => { setEnLinea(true); void sincronizar(); };
    const offline = () => setEnLinea(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [contarPendientes, sincronizar]);

  return { enLinea, pendientes, sincronizando, ultimaSync, sincronizar };
}
