import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CrearTipoEstablecimientoDto, ActualizarTipoEstablecimientoDto } from './dto/tipo-establecimiento.dto';

export interface TipoEstablecimientoItem {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fechaCreacion: string;
}

const TIPOS_PREDEFINIDOS_DEFAULT: TipoEstablecimientoItem[] = [
  { id: 1, nombre: 'Planta Procesadora / Fabricación de Alimentos', descripcion: 'Elaboración y transformación industrial de alimentos', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 2, nombre: 'Empacadora y Envasadora de Alimentos', descripcion: 'Fraccionamiento, envasado y empaque primario o secundario', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 3, nombre: 'Almacén y Centro de Distribución', descripcion: 'Depósito, acopio y logística de productos terminados', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 4, nombre: 'Distribuidora Mayorista de Alimentos', descripcion: 'Comercialización al por mayor de alimentos y bebidas', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 5, nombre: 'Frigorífico / Almacenamiento en Frío', descripcion: 'Cámaras frigoríficas y congelación de productos perecederos', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 6, nombre: 'Planta de Tratamiento y Envasado de Agua', descripcion: 'Purificación y embotellado de agua para consumo humano', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 7, nombre: 'Cocina Central / Catering Industrial', descripcion: 'Preparación a gran escala para comedores y servicios alimentarios', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
  { id: 8, nombre: 'Panificadora y Repostería Industrial', descripcion: 'Fabricación masiva de productos de panadería y repostería', activo: true, fechaCreacion: '2026-01-01T00:00:00Z' },
];

@Injectable()
export class CatalogosService {
  private readonly filePath = path.join(__dirname, '..', '..', 'data', 'tipos-establecimiento.json');

  constructor() {
    this.asegurarArchivo();
  }

  private asegurarArchivo() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify(TIPOS_PREDEFINIDOS_DEFAULT, null, 2), 'utf-8');
      }
    } catch {
      // Si el entorno bloquea la escritura, se utilizará la lista en memoria
    }
  }

  private leer(): TipoEstablecimientoItem[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw) as TipoEstablecimientoItem[];
      }
    } catch {
      // fallback a defaults
    }
    return [...TIPOS_PREDEFINIDOS_DEFAULT];
  }

  private guardar(items: TipoEstablecimientoItem[]) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    } catch {
      // fallback silencioso
    }
  }

  listarTipos(soloActivos = false): TipoEstablecimientoItem[] {
    const todos = this.leer();
    return soloActivos ? todos.filter((t) => t.activo) : todos;
  }

  crearTipo(dto: CrearTipoEstablecimientoDto): TipoEstablecimientoItem {
    const items = this.leer();
    const existe = items.some((i) => i.nombre.trim().toLowerCase() === dto.nombre.trim().toLowerCase());
    if (existe) {
      throw new BadRequestException(`El tipo de establecimiento '${dto.nombre}' ya existe.`);
    }

    const nuevoId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    const nuevo: TipoEstablecimientoItem = {
      id: nuevoId,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim(),
      activo: true,
      fechaCreacion: new Date().toISOString(),
    };

    items.push(nuevo);
    this.guardar(items);
    return nuevo;
  }

  actualizarTipo(id: number, dto: ActualizarTipoEstablecimientoDto): TipoEstablecimientoItem {
    const items = this.leer();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new NotFoundException('Tipo de establecimiento no encontrado.');
    }

    const item = items[index];
    if (dto.nombre && dto.nombre.trim()) {
      const duplicado = items.some(
        (i) => i.id !== id && i.nombre.trim().toLowerCase() === dto.nombre?.trim().toLowerCase()
      );
      if (duplicado) {
        throw new BadRequestException(`El tipo de establecimiento '${dto.nombre}' ya existe.`);
      }
      item.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      item.descripcion = dto.descripcion.trim();
    }

    if (dto.activo !== undefined) {
      item.activo = dto.activo;
    }

    items[index] = item;
    this.guardar(items);
    return item;
  }

  eliminarTipo(id: number) {
    const items = this.leer();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new NotFoundException('Tipo de establecimiento no encontrado.');
    }

    // Desactivación lógica para no romper registros existentes
    items[index].activo = false;
    this.guardar(items);
    return { mensaje: 'Tipo de establecimiento desactivado correctamente.' };
  }
}
