import { describe, it, expect } from 'vitest';
import { flattenSecciones } from './flatten';
import type { NodoCatalogo } from '@/lib/types';

const arbol: NodoCatalogo[] = [
  {
    id: '1', idPadre: null, numeracion: '1', titulo: 'Sección', nivel: 1, orden: 1,
    esEvaluable: false, peso: 0, idCriticidad: null,
    hijos: [
      {
        id: '2', idPadre: '1', numeracion: '1.1', titulo: 'Subsección', nivel: 2, orden: 1,
        esEvaluable: false, peso: 0, idCriticidad: null,
        hijos: [
          {
            id: '3', idPadre: '2', numeracion: '1.1.1', titulo: 'Criterio', nivel: 3, orden: 1,
            esEvaluable: true, peso: 1.0, idCriticidad: '1',
            hijos: [],
          },
        ],
      },
    ],
  },
];

describe('flattenSecciones', () => {
  it('devuelve lista plana con todos los nodos', () => {
    const plana = flattenSecciones(arbol, '1');
    expect(plana).toHaveLength(3);
  });

  it('asigna versionFichaId a cada item', () => {
    const plana = flattenSecciones(arbol, '1');
    expect(plana.every(i => i.versionFichaId === '1')).toBe(true);
  });

  it('preserva idPadre correctamente', () => {
    const plana = flattenSecciones(arbol, '1');
    const sub = plana.find(i => i.id === '2');
    expect(sub?.idPadre).toBe('1');
  });

  it('lista vacía devuelve array vacío', () => {
    expect(flattenSecciones([], '1')).toEqual([]);
  });
});
