import { describe, it, expect } from 'vitest';
import {
  claveDeFecha,
  diaDeSemana,
  diasDelRango,
  etiquetaPeriodo,
  finMes,
  inicioMes,
  inicioSemana,
  mover,
  rangoVisible,
  sumarDias,
  sumarMeses,
} from './fechas';

describe('fechas del calendario', () => {
  describe('claveDeFecha', () => {
    it('toma el día del ISO sin pasar por la zona horaria (medianoche UTC no cae en el día anterior)', () => {
      expect(claveDeFecha('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
      expect(claveDeFecha('2026-01-01T00:00:00.000Z')).toBe('2026-01-01');
    });
  });

  describe('aritmética de días', () => {
    it('suma días cruzando mes y año', () => {
      expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
      expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
      expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
      expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
    });

    it('la semana empieza el lunes', () => {
      expect(diaDeSemana('2026-09-21')).toBe(0); // lunes
      expect(diaDeSemana('2026-09-27')).toBe(6); // domingo
      expect(inicioSemana('2026-09-27')).toBe('2026-09-21');
      expect(inicioSemana('2026-09-21')).toBe('2026-09-21');
    });
  });

  describe('meses', () => {
    it('inicio y fin de mes, incluido febrero bisiesto', () => {
      expect(inicioMes('2026-09-15')).toBe('2026-09-01');
      expect(finMes('2026-09-15')).toBe('2026-09-30');
      expect(finMes('2026-02-10')).toBe('2026-02-28');
      expect(finMes('2028-02-10')).toBe('2028-02-29');
    });

    it('sumar meses conserva el día o usa el último del mes destino', () => {
      expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
      expect(sumarMeses('2026-12-15', 1)).toBe('2027-01-15');
      expect(sumarMeses('2026-01-15', -1)).toBe('2025-12-15');
      expect(sumarMeses('2026-03-31', -1)).toBe('2026-02-28');
    });
  });

  describe('rangoVisible (lo que se le pide al backend)', () => {
    it('mes: de la semana que contiene el día 1 a la que contiene el último día', () => {
      expect(rangoVisible('mes', '2026-09-15')).toEqual({ desde: '2026-08-31', hasta: '2026-10-04' });
    });

    it('mes que empieza en domingo: febrero de 2026', () => {
      expect(rangoVisible('mes', '2026-02-10')).toEqual({ desde: '2026-01-26', hasta: '2026-03-01' });
    });

    it('semana: lunes a domingo', () => {
      expect(rangoVisible('semana', '2026-09-23')).toEqual({ desde: '2026-09-21', hasta: '2026-09-27' });
    });

    it('día: solo ese día', () => {
      expect(rangoVisible('dia', '2026-09-23')).toEqual({ desde: '2026-09-23', hasta: '2026-09-23' });
    });

    it('diasDelRango devuelve todos los días, ambos extremos incluidos', () => {
      const { desde, hasta } = rangoVisible('mes', '2026-09-15');
      const dias = diasDelRango(desde, hasta);
      expect(dias).toHaveLength(35);
      expect(dias[0]).toBe('2026-08-31');
      expect(dias[34]).toBe('2026-10-04');
    });
  });

  describe('mover', () => {
    it('salta un día, una semana o un mes según la vista', () => {
      expect(mover('dia', '2026-09-21', 1)).toBe('2026-09-22');
      expect(mover('semana', '2026-09-21', -1)).toBe('2026-09-14');
      expect(mover('mes', '2026-09-21', 1)).toBe('2026-10-21');
      expect(mover('mes', '2026-01-31', 1)).toBe('2026-02-28');
    });
  });

  describe('etiquetaPeriodo', () => {
    it('mes y día en español', () => {
      expect(etiquetaPeriodo('mes', '2026-09-21')).toBe('septiembre de 2026');
      expect(etiquetaPeriodo('dia', '2026-09-21')).toBe('lunes, 21 de septiembre de 2026');
    });

    it('semana dentro de un mismo mes', () => {
      expect(etiquetaPeriodo('semana', '2026-09-23')).toBe('21 – 27 de septiembre de 2026');
    });

    it('semana que cruza de mes', () => {
      expect(etiquetaPeriodo('semana', '2026-09-30')).toBe('28 sept – 4 oct de 2026');
    });

    it('semana que cruza de año lleva el año en los dos extremos', () => {
      expect(etiquetaPeriodo('semana', '2026-12-30')).toBe('28 dic de 2026 – 3 ene de 2027');
    });
  });
});
