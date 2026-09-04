import { db, type OperacionPendiente } from '@/lib/db';

const MAX_INTENTOS = 10;

export async function enqueue(tipo: OperacionPendiente['tipo'], payload: object): Promise<string> {
  const uuidLocal = crypto.randomUUID();
  await db.cola_sync.add({
    uuidLocal, tipo, payload,
    timestamp: Date.now(),
    intentos: 0,
    estado: 'pendiente',
  });
  return uuidLocal;
}

export async function getPendientes(): Promise<OperacionPendiente[]> {
  return db.cola_sync.where('estado').equals('pendiente').sortBy('timestamp');
}

export async function marcarEnviada(uuidLocal: string): Promise<void> {
  await db.cola_sync.update(uuidLocal, { estado: 'enviado' });
}

export async function marcarError(uuidLocal: string, errorMsg: string): Promise<void> {
  const op = await db.cola_sync.get(uuidLocal);
  if (!op) return;
  const intentos = op.intentos + 1;
  await db.cola_sync.update(uuidLocal, {
    intentos,
    errorMsg,
    estado: intentos >= MAX_INTENTOS ? 'error' : 'pendiente',
  });
}
