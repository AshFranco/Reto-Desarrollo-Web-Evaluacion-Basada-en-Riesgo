import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LoginThrottleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async assertNotLocked(usuarioId: bigint): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { bloqueadoHasta: true },
    });

    if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      throw new UnauthorizedException(
        'Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intente más tarde.',
      );
    }
  }

  async registrarIntentoFallido(usuarioId: bigint): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { intentosFallidos: true },
    });

    const intentos = (usuario?.intentosFallidos ?? 0) + 1;
    const debeBloquear = intentos >= this.config.loginMaxAttempts;

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        intentosFallidos: debeBloquear ? 0 : intentos,
        bloqueadoHasta: debeBloquear
          ? new Date(Date.now() + this.config.loginLockMinutes * 60_000)
          : undefined,
      },
    });
  }

  async registrarLoginExitoso(usuarioId: bigint): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
  }
}
