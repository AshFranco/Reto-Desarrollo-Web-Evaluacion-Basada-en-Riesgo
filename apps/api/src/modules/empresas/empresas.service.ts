import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearEmpresaDto, ActualizarEmpresaDto } from './dto/empresa.dto';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearEmpresaDto) {
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
