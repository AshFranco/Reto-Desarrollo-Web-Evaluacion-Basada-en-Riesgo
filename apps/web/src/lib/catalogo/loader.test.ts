import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { descargarCatalogo, necesitaActualizar } from './loader';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('descargarCatalogo', () => {
  it('guarda items aplanados y meta en Dexie', async () => {
    await descargarCatalogo();

    const items = await db.catalogo_item.toArray();
    expect(items.length).toBeGreaterThan(0);
    expect(items).toHaveLength(2); // raíz + hijo del mock

    const meta = await db.catalogo_meta.get(1);
    expect(meta?.versionFichaId).toBe('1');
    expect(meta?.opcionesRespuesta).toHaveLength(4);
  });

  it('los items tienen versionFichaId asignado', async () => {
    await descargarCatalogo();
    const items = await db.catalogo_item.toArray();
    expect(items.every(i => i.versionFichaId === '1')).toBe(true);
  });
});

describe('necesitaActualizar', () => {
  it('devuelve true si no hay catalogo descargado', async () => {
    expect(await necesitaActualizar('1')).toBe(true);
  });

  it('devuelve false si la version coincide', async () => {
    await descargarCatalogo();
    expect(await necesitaActualizar('1')).toBe(false);
  });

  it('devuelve true si la version cambió', async () => {
    await descargarCatalogo();
    expect(await necesitaActualizar('99')).toBe(true);
  });
});
