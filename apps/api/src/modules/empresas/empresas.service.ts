import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearEmpresaDto, ActualizarEmpresaDto } from './dto/empresa.dto';
import { InvitarDelegadoDto, EstadoDelegadoDto } from './dto/delegados.dto';
import { JwtPayload } from '../auth/token.service';
import { PasswordService } from '../auth/password.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];
const ROLES_EMPRESA = ['ADMINISTRADOR_EMPRESA'];

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * RF-03: "la empresa gestiona sus propios datos". Solo el Admin Empresa
   * puede registrar/editar SU empresa -- el Usuario Delegado actúa en
   * representación de la empresa para trámites (solicitudes BPM), pero no
   * administra sus datos. Se registra solo si todavía no está vinculado a
   * ninguna empresa (evita que un mismo usuario cree varias encadenadas).
   * Al crearla, se le asigna automáticamente.
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

  async listarPublicas() {
    const empresas = await this.prisma.empresa.findMany({
      select: {
        id: true,
        razonSocial: true,
        rnc: true,
        nombreComercial: true,
      },
      orderBy: { razonSocial: 'asc' },
    });
    return empresas.map((e) => ({ ...e, id: e.id.toString() }));
  }

  // --- Gestión de Delegados ---

  async listarDelegados(empresaId: string) {
    const delegados = await this.prisma.usuario.findMany({
      where: {
        idEmpresa: BigInt(empresaId),
        roles: { some: { rol: { codigo: 'USUARIO_DELEGADO' } } },
      },
      select: {
        id: true,
        nombreCompleto: true,
        correoElectronico: true,
        estado: true,
        fechaCreacion: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    return delegados.map(d => ({
      ...d,
      id: d.id.toString(),
    }));
  }

  async invitarDelegado(empresaId: string, dto: InvitarDelegadoDto) {
    const existente = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { correoElectronico: dto.correoElectronico },
          { cedulaPasaporte: dto.cedulaPasaporte },
        ],
      },
    });
    if (existente) {
      throw new BadRequestException('Ya existe un usuario con este correo o cédula/pasaporte.');
    }

    const rolDelegado = await this.prisma.rol.findUnique({
      where: { codigo: 'USUARIO_DELEGADO' },
    });
    if (!rolDelegado) throw new NotFoundException('Rol de delegado no encontrado en el sistema.');

    // Contraseña temporal aleatoria por invitación -- una constante fija aquí
    // sería una credencial universal conocida para CUALQUIER delegado de
    // CUALQUIER empresa del sistema. Se devuelve una única vez en la
    // respuesta para que el Admin Empresa la comunique por un canal seguro;
    // no se puede recuperar después (solo su hash queda almacenado).
    const contrasenaTemporal = randomBytes(9).toString('base64url');
    const contrasenaHash = await this.passwordService.hash(contrasenaTemporal);

    const nuevoDelegado = await this.prisma.usuario.create({
      data: {
        nombreCompleto: dto.nombreCompleto,
        correoElectronico: dto.correoElectronico,
        cedulaPasaporte: dto.cedulaPasaporte,
        contrasenaHash,
        idEmpresa: BigInt(empresaId),
        estado: 'APROBADO', // Nace aprobado por el admin de su empresa
        roles: {
          create: { idRol: rolDelegado.id },
        },
      },
    });

    return {
      id: nuevoDelegado.id.toString(),
      nombreCompleto: nuevoDelegado.nombreCompleto,
      correoElectronico: nuevoDelegado.correoElectronico,
      estado: nuevoDelegado.estado,
      contrasenaTemporal,
    };
  }

  async cambiarEstadoDelegado(id: string, empresaId: string, estado: string) {
    const delegado = await this.prisma.usuario.findFirst({
      where: {
        id: BigInt(id),
        idEmpresa: BigInt(empresaId),
        roles: { some: { rol: { codigo: 'USUARIO_DELEGADO' } } },
      },
    });

    if (!delegado) {
      throw new NotFoundException('Delegado no encontrado en esta empresa.');
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id: BigInt(id) },
      data: { estado },
    });

    return {
      id: actualizado.id.toString(),
      estado: actualizado.estado,
    };
  }

  /** Convierte BigInt a string para que la respuesta JSON no falle. */
  private serializar(empresa: any) {
    return { ...empresa, id: empresa.id.toString(), idMunicipio: empresa.idMunicipio?.toString() ?? null };
  }
}
