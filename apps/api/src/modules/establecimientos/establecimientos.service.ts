import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearEstablecimientoDto, ActualizarEstablecimientoDto } from './dto/establecimiento.dto';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];
const ROLES_EMPRESA = ['ADMINISTRADOR_EMPRESA'];

/**
 * `establecimiento` es la entidad sobre la que giran los flujos reales:
 * caso.id_establecimiento, evaluacion.id_establecimiento,
 * establecimiento_categoria -- una empresa puede tener varios (sucursales
 * / plantas), por eso es su propio recurso, no un campo de la empresa.
 */
@Injectable()
export class EstablecimientosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearEstablecimientoDto, user: JwtPayload) {
    let idEmpresa: bigint;

    if (ROLES_EMPRESA.includes(user.rol)) {
      if (!user.empresaId) {
        throw new BadRequestException('Su usuario no está vinculado a ninguna empresa todavía.');
      }
      idEmpresa = BigInt(user.empresaId);
    } else {
      if (!dto.empresaId) {
        throw new BadRequestException('Debe indicar empresaId.');
      }
      idEmpresa = BigInt(dto.empresaId);
    }

    const empresa = await this.prisma.empresa.findUnique({ where: { id: idEmpresa } });
    if (!empresa) throw new BadRequestException('La empresa indicada no existe.');

    const establecimiento = await this.prisma.establecimiento.create({
      data: {
        idEmpresa,
        nombre: dto.nombre,
        rnc: dto.rnc,
        calle: dto.calle,
        idMunicipio: dto.idMunicipio ? BigInt(dto.idMunicipio) : undefined,
        idDpsDas: dto.idDpsDas ? Number(dto.idDpsDas) : undefined,
        telefono: dto.telefono,
        correo: dto.correo,
        fechaInicioOperaciones: dto.fechaInicioOperaciones ? new Date(dto.fechaInicioOperaciones) : undefined,
        numeroPermisoSanitario: dto.numeroPermisoSanitario,
        fechaVencimientoPermiso: dto.fechaVencimientoPermiso ? new Date(dto.fechaVencimientoPermiso) : undefined,
        produccionAnual: dto.produccionAnual,
        empleadosMasculino: dto.empleadosMasculino ?? 0,
        empleadosFemenino: dto.empleadosFemenino ?? 0,
        mercadoObjetivo: dto.mercadoObjetivo,
        comercializacion: dto.comercializacion,
        latitud: dto.latitud,
        longitud: dto.longitud,
      },
    });
    return this.serializar(establecimiento);
  }

  async listar(user: JwtPayload, empresaIdFiltro?: string) {
    let where: any = {};
    if (ROLES_INTERNOS.includes(user.rol)) {
      if (empresaIdFiltro) where.idEmpresa = BigInt(empresaIdFiltro);
    } else {
      if (!user.empresaId) return [];
      where.idEmpresa = BigInt(user.empresaId);
    }

    const establecimientos = await this.prisma.establecimiento.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
    return establecimientos.map((e) => this.serializar(e));
  }

  async obtener(id: string, user: JwtPayload) {
    const establecimiento = await this.prisma.establecimiento.findUnique({
      where: { id: BigInt(id) },
      include: { empresa: true, contactos: true, establecimientoCategorias: { include: { subcategoria: true } } },
    });
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado.');

    if (!ROLES_INTERNOS.includes(user.rol) && establecimiento.idEmpresa.toString() !== user.empresaId) {
      throw new ForbiddenException('No tiene acceso a este establecimiento.');
    }
    return this.serializar(establecimiento);
  }

  async actualizar(id: string, dto: ActualizarEstablecimientoDto, user: JwtPayload) {
    const establecimiento = await this.prisma.establecimiento.findUnique({ where: { id: BigInt(id) } });
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado.');

    if (!ROLES_INTERNOS.includes(user.rol) && establecimiento.idEmpresa.toString() !== user.empresaId) {
      throw new ForbiddenException('No tiene acceso a este establecimiento.');
    }

    const actualizado = await this.prisma.establecimiento.update({
      where: { id: BigInt(id) },
      data: {
        nombre: dto.nombre,
        rnc: dto.rnc,
        calle: dto.calle,
        idMunicipio: dto.idMunicipio ? BigInt(dto.idMunicipio) : undefined,
        idDpsDas: dto.idDpsDas ? Number(dto.idDpsDas) : undefined,
        telefono: dto.telefono,
        correo: dto.correo,
        fechaInicioOperaciones: dto.fechaInicioOperaciones ? new Date(dto.fechaInicioOperaciones) : undefined,
        numeroPermisoSanitario: dto.numeroPermisoSanitario,
        fechaVencimientoPermiso: dto.fechaVencimientoPermiso ? new Date(dto.fechaVencimientoPermiso) : undefined,
        produccionAnual: dto.produccionAnual,
        empleadosMasculino: dto.empleadosMasculino,
        empleadosFemenino: dto.empleadosFemenino,
        mercadoObjetivo: dto.mercadoObjetivo,
        comercializacion: dto.comercializacion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        activo: dto.activo,
      },
    });
    return this.serializar(actualizado);
  }

  private serializar(e: any) {
    return {
      ...e,
      id: e.id.toString(),
      idEmpresa: e.idEmpresa.toString(),
      idMunicipio: e.idMunicipio?.toString() ?? null,
    };
  }
}
