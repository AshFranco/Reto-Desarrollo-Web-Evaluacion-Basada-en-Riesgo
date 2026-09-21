import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // id de usuario (BigInt serializado como string en el token)
  rol: string; // código del rol principal
  empresaId: string | null;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessExpiresIn,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, {
      secret: this.config.jwtAccessSecret,
    });
  }

  signPasswordResetToken(userId: string, passwordHashSlice: string): string {
    return this.jwt.sign(
      { sub: userId, pwh: passwordHashSlice, purpose: 'pwd_reset' },
      { secret: this.config.jwtAccessSecret, expiresIn: '1h' },
    );
  }

  verifyPasswordResetToken(token: string): { sub: string; pwh: string; purpose: string } {
    return this.jwt.verify(token, {
      secret: this.config.jwtAccessSecret,
    });
  }

  async issueRefreshToken(
    userId: bigint,
    meta: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const rawToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        idUsuario: userId,
        tokenHash,
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiraEn,
      },
    });

    return rawToken;
  }

  async rotateRefreshToken(
    rawOldToken: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ userId: bigint; newRawToken: string } | null> {
    const oldHash = this.hashToken(rawOldToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: oldHash },
    });

    if (!existing || existing.revocado || existing.expiraEn < new Date()) {
      if (existing) {
        await this.prisma.refreshToken.updateMany({
          where: { idUsuario: existing.idUsuario },
          data: { revocado: true },
        });
      }
      return null;
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revocado: true },
    });

    const newRawToken = await this.issueRefreshToken(existing.idUsuario, meta);
    return { userId: existing.idUsuario, newRawToken };
  }

  async revokeAllForUser(userId: bigint): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { idUsuario: userId },
      data: { revocado: true },
    });
  }

  setRefreshCookie(res: Response, rawToken: string) {
    const isProd = Boolean(this.config.isProduction);
    res.cookie('refresh_token', rawToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      domain: isProd ? this.config.cookieDomain : undefined,
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });
  }

  clearRefreshCookie(res: Response) {
    const isProd = Boolean(this.config.isProduction);
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      domain: isProd ? this.config.cookieDomain : undefined,
      path: '/api/v1/auth',
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
