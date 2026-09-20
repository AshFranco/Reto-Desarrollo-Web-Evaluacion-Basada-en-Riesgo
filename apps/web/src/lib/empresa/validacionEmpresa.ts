import type { DatosEmpresa } from './useEmpresas';

export const EMPRESA_VACIA: DatosEmpresa = {
  razonSocial: '',
  rnc: '',
  nombreComercial: '',
  direccion: '',
  telefono: '',
  correo: '',
  actividadEconomica: '',
};

const RNC_REGEX = /^[0-9]{9}$|^[0-9]{11}$/;
const TELEFONO_REGEX = /^[0-9]{10}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ErroresEmpresa {
  rnc?: string;
  telefono?: string;
  correo?: string;
}

export function validarEmpresa(datos: { rnc: string; telefono?: string; correo?: string }): ErroresEmpresa {
  const errores: ErroresEmpresa = {};
  if (datos.rnc) {
    if (datos.rnc.includes('-')) {
      errores.rnc = 'El RNC no puede contener guiones ni signos negativos.';
    } else if (!RNC_REGEX.test(datos.rnc)) {
      errores.rnc = 'El RNC debe ser numérico y de 9 o de 11 dígitos.';
    }
  }

  if (datos.telefono) {
    if (datos.telefono.includes('-')) {
      errores.telefono = 'El teléfono no puede contener signos negativos ni guiones.';
    } else if (!TELEFONO_REGEX.test(datos.telefono)) {
      errores.telefono = 'El teléfono debe contener exactamente 10 dígitos numéricos.';
    }
  }

  if (datos.correo && !CORREO_REGEX.test(datos.correo)) {
    errores.correo = 'El formato del correo electrónico no es válido.';
  }

  return errores;
}

/**
 * El backend valida los campos opcionales con `@IsOptional() @IsEmail()` etc.,
 * y IsOptional solo omite null/undefined -- un string vacío ("") sí se valida
 * y falla (ej. correo: "" -> 400 "El correo electrónico no es válido"). Los
 * formularios guardan los campos vacíos como "", así que se descartan antes
 * de enviar.
 */
export function limpiarDatosEmpresa(datos: DatosEmpresa): DatosEmpresa {
  return Object.fromEntries(
    Object.entries(datos).filter(([, valor]) => typeof valor !== 'string' || valor.trim() !== '')
  ) as unknown as DatosEmpresa;
}
