import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verifica el token de captcha (hCaptcha/reCAPTCHA) contra el servidor del
 * proveedor. Nunca confía en la validación hecha en el cliente: siempre
 * re-verifica server-to-server con la clave secreta (que nunca sale del backend).
 */
@Injectable()
export class CaptchaService {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string, remoteIp?: string): Promise<void> {
    const provider = this.config.get<string>('CAPTCHA_PROVIDER', 'hcaptcha');
    const secret = this.config.get<string>('CAPTCHA_SECRET_KEY');
    const endpoint =
      provider === 'recaptcha'
        ? 'https://www.google.com/recaptcha/api/siteverify'
        : 'https://hcaptcha.com/siteverify';

    const params = new URLSearchParams({ secret: secret ?? '', response: token });
    if (remoteIp) params.set('remoteip', remoteIp);

    const response = await fetch(endpoint, { method: 'POST', body: params });
    const data = (await response.json()) as { success: boolean };

    if (!data.success) {
      throw new UnauthorizedException('Verificación anti-bot fallida.');
    }
  }
}
