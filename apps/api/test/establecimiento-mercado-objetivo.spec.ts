import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { COMERCIALIZACIONES, CrearEstablecimientoDto, MERCADOS_OBJETIVO } from '../src/modules/establecimientos/dto/establecimiento.dto';

async function errorDeMercado(mercadoObjetivo: unknown): Promise<string[]> {
  const dto = plainToInstance(CrearEstablecimientoDto, { nombre: 'Planta', mercadoObjetivo });
  const errores = await validate(dto);
  return errores.filter((e) => e.property === 'mercadoObjetivo').flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('Mercado objetivo del establecimiento', () => {
  it.each([...MERCADOS_OBJETIVO])('acepta la opción "%s" de la Ficha BPM', async (opcion) => {
    expect(await errorDeMercado(opcion)).toEqual([]);
  });

  it('acepta que no se indique (vacío o ausente)', async () => {
    expect(await errorDeMercado('')).toEqual([]);
    expect(await errorDeMercado(undefined)).toEqual([]);
  });

  it('rechaza un texto que no está en la lista', async () => {
    expect(await errorDeMercado('Exportación a Marte')).toEqual(['Seleccione un mercado objetivo válido de la lista.']);
  });

  it('la lista es la del Excel de la ficha', () => {
    expect([...MERCADOS_OBJETIVO]).toEqual([
      'Infantil',
      'Niños menores',
      'Adultos',
      'Mujeres embarazadas',
      'Adultos mayores',
      'Todos los segmentos',
    ]);
  });
});

async function errorDeComercializacion(comercializacion: unknown): Promise<string[]> {
  const dto = plainToInstance(CrearEstablecimientoDto, { nombre: 'Planta', comercializacion });
  const errores = await validate(dto);
  return errores.filter((e) => e.property === 'comercializacion').flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('Comercialización del establecimiento', () => {
  it.each([...COMERCIALIZACIONES])('acepta la opción "%s" de la Ficha BPM', async (opcion) => {
    expect(await errorDeComercializacion(opcion)).toEqual([]);
  });

  it('acepta que no se indique (vacío o ausente)', async () => {
    expect(await errorDeComercializacion('')).toEqual([]);
    expect(await errorDeComercializacion(undefined)).toEqual([]);
  });

  it('rechaza un texto que no está en la lista', async () => {
    expect(await errorDeComercializacion('Interplanetario')).toEqual([
      'Seleccione una opción de comercialización válida de la lista.',
    ]);
  });

  it('la lista es la del Excel de la ficha', () => {
    expect([...COMERCIALIZACIONES]).toEqual(['Local', 'Nacional', 'Internacional', 'Todos los mercados']);
  });
});
