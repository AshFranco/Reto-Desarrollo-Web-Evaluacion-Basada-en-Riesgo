import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload, TokenService } from './token.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Autenticación')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  @Post('registro')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } }) // 5 registros/hora por IP
  @ApiOperation({ summary: 'Registro de nuevo usuario externo' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente (pendiente de validación).' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o documento/correo ya registrado.' })
  async registro(@Body() dto: RegistroUsuarioDto) {
    return this.authService.registrar(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 60_000 } }) // 8 intentos/min por IP (protección de bots/fuerza bruta)
  @ApiOperation({ summary: 'Inicio de sesión con correo y contraseña' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa, retorna access token y datos del usuario.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta bloqueada/inactiva.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if ('requiereMfa' in result) return result;

    this.tokenService.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renovación de access token mediante cookie de refresco' })
  @ApiResponse({ status: 200, description: 'Nuevo access token emitido exitosamente.' })
  @ApiResponse({ status: 403, description: 'Cookie de refresco ausente, expirada o revocada.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.signedCookies?.refresh_token;
    if (!rawRefreshToken) {
      throw new ForbiddenException('No hay sesión activa.');
    }

    const result = await this.authService.refresh(rawRefreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    this.tokenService.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cierre de sesión y revocación de tokens' })
  @ApiResponse({ status: 204, description: 'Sesión cerrada y tokens revocados correctamente.' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    this.tokenService.clearRefreshCookie(res);
  }
}
