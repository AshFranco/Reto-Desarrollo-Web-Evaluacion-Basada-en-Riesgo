import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearEmpresaDto, ActualizarEmpresaDto } from './dto/empresa.dto';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];
const ROLES_EMPRESA = ['ADMINISTRADOR_EMPRESA', 'USUARIO_DELEGADO'];

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * RF-03: "la empresa gestiona sus propios datos". Un Admin Empresa o
   * Usuario Delegado puede registrar SU empresa -- pero solo si todavía
   * no está vinculado a ninguna (evita que un mismo usuario cree varias
   * empresas encadenadas). Al crearla, se le asigna automáticamente.
   */
  async crear(dto: CrearEmpresaDto, user: JwtPayload) {
    if (ROLES_EMPRESA.includes(user.rol) && user.empresaId) {
      throw new BadRequestException(
        'Su usuario ya está vinculado a una empresa; no puede registrar otra.',
      );
    }

    const empresa = await this.prisma.empresa.create({
      data: {
        razonSocial: dto.razonSocial,
        rnc: dto.rnc,
        nombreComercial: dto.nombreComercial,
        direccion: dto.direccion,
        idMunicipio: dto.idMunicipio ? BigInt(dto.idMunicipio) : undefined,
        telefono: dto.telefono,
        correo: dto.correo,
        actividadEconomica: dto.actividadEconomica,
      },
    });

    // Vincula automáticamente la empresa recién creada al usuario que la
    // registró, si es un rol de empresa sin empresa asignada todavía.
    if (ROLES_EMPRESA.includes(user.rol) && !user.empresaId) {
      await this.prisma.usuario.update({
        where: { id: BigInt(user.sub) },
        data: { idEmpresa: empresa.id },
      });
    }

    return this.serializar(empresa);
  }

  async listar(user: JwtPayload) {
    const empresas = ROLES_INTERNOS.includes(user.rol)
      ? await this.prisma.empresa.findMany({ orderBy: { razonSocial: 'asc' } })
      : await this.prisma.empresa.findMany({
          where: { id: user.empresaId ? BigInt(user.empresaId) : undefined },
        });
    return empresas.map((e) => this.serializar(e));
  }

  async obtener(id: string, user: JwtPayload) {
    if (!ROLES_INTERNOS.includes(user.rol) && id !== user.empresaId) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: BigInt(id) },
      include: { contactos: true, establecimientos: true },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    return this.serializar(empresa);
  }

  async actualizar(id: string, dto: ActualizarEmpresaDto, user: JwtPayload) {
    if (!ROLES_INTERNOS.includes(user.rol) && id !== user.empresaId) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    const empresa = await this.prisma.empresa.update({
      where: { id: BigInt(id) },
      data: {
        razonSocial: dto.razonSocial,
        rnc: dto.rnc,
        nombreComercial: dto.nombreComercial,
        direccion: dto.direccion,
        idMunicipio: dto.idMunicipio ? BigInt(dto.idMunicipio) : undefined,
        telefono: dto.telefono,
        correo: dto.correo,
        actividadEconomica: dto.actividadEconomica,
      },
    });
    return this.serializar(empresa);
  }

  /** Convierte BigInt a string para que la respuesta JSON no falle. */
  private serializar(empresa: any) {
    return { ...empresa, id: empresa.id.toString(), idMunicipio: empresa.idMunicipio?.toString() ?? null };
  }
}
