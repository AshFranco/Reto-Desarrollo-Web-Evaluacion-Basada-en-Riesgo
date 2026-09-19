import { db, type OperacionPendiente } from '@/lib/db';

const MAX_INTENTOS = 10;

/**
 * Date.now() puede repetirse entre dos enqueue() en el mismo milisegundo
 * (común con Promise.all o encolados en ráfaga), rompiendo el orden FIFO
 * que getPendientes()/SyncProcessor asumen al ordenar por timestamp. Este
 * contador garantiza que cada timestamp sea estrictamente mayor al anterior.
 */
let ultimoTimestamp = 0;
function timestampMonotono(): number {
  const ahora = Date.now();
  ultimoTimestamp = ahora > ultimoTimestamp ? ahora : ultimoTimestamp + 1;
  return ultimoTimestamp;
}

export async function enqueue(tipo: OperacionPendiente['tipo'], payload: object): Promise<string> {
  const uuidLocal = crypto.randomUUID();
  await db.cola_sync.add({
    uuidLocal, tipo, payload,
    timestamp: timestampMonotono(),
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
