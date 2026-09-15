import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service';

export interface EnviarCorreoOpciones {
  para: string;
  asunto: string;
  html: string;
  texto?: string;
}

export interface ResultadoEnvioCorreo {
  ok: boolean;
  messageId?: string;
  previewUrl?: string | null;
  error?: string;
  response?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporterPromise: Promise<Transporter> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private async getTransporter(): Promise<Transporter> {
    if (this.transporterPromise) {
      return this.transporterPromise;
    }

    this.transporterPromise = (async () => {
      const host = this.config.smtpHost;

      if (host && this.config.smtpUser && this.config.smtpPass) {
        this.logger.log(`Inicializando transporte SMTP conectado a ${host}:${this.config.smtpPort}`);
        return nodemailer.createTransport({
          host,
          port: this.config.smtpPort,
          secure: this.config.smtpSecure,
          auth: {
            user: this.config.smtpUser,
            pass: this.config.smtpPass,
          },
        });
      }

      // Modo desarrollo / sin SMTP externo: crear cuenta de prueba en Ethereal
      this.logger.log('Sin SMTP externo configurado. Creando cuenta de correo de prueba en Ethereal Email...');
      const testAccount = await nodemailer.createTestAccount();
      this.logger.log(`Cuenta Ethereal activa: ${testAccount.user}`);

      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();

    return this.transporterPromise;
  }

  async enviarCorreo(opciones: EnviarCorreoOpciones): Promise<ResultadoEnvioCorreo> {
    try {
      const transporter = await this.getTransporter();
      const remitente = this.config.smtpFrom;

      const info = await transporter.sendMail({
        from: remitente,
        to: opciones.para,
        subject: opciones.asunto,
        text: opciones.texto ?? opciones.html.replace(/<[^>]*>?/gm, ''),
        html: opciones.html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`[EmailService] ✉️ Correo enviado a ${opciones.para}. Vista previa web: ${previewUrl}`);
      } else {
        this.logger.log(`[EmailService] ✉️ Correo enviado a ${opciones.para} (ID: ${info.messageId})`);
      }

      return {
        ok: true,
        messageId: info.messageId,
        previewUrl: previewUrl ? String(previewUrl) : null,
        response: info.response,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[EmailService] ❌ Error enviando correo a ${opciones.para}: ${errorMsg}`);
      return {
        ok: false,
        error: errorMsg,
      };
    }
  }

  async enviarRecuperacionContrasena(
    para: string,
    nombreCompleto: string,
    enlaceRestablecer: string,
  ): Promise<ResultadoEnvioCorreo> {
    const asunto = 'Restablecimiento de contraseña — Sistema EBR/BPM DIGEMAPS';
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${asunto}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f4c81; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .content h2 { margin-top: 0; font-size: 18px; color: #0f172a; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #0f4c81; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 15px; border-radius: 6px; }
    .footer { background: #f8fafc; padding: 18px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
    .warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #92400e; border-radius: 0 6px 6px 0; }
    .fallback-url { word-break: break-all; font-size: 12px; color: #0f4c81; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DIGEMAPS — EBR / BPM</h1>
      <p>Evaluación Basada en Riesgo · Inocuidad de Alimentos</p>
    </div>
    <div class="content">
      <h2>Solicitud de restablecimiento de contraseña</h2>
      <p>Hola, <strong>${nombreCompleto}</strong>:</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta institucional en la plataforma EBR/BPM.</p>
      
      <div class="btn-container">
        <a href="${enlaceRestablecer}" class="btn" target="_blank">Restablecer mi contraseña</a>
      </div>

      <div class="warning">
        <strong>Importante:</strong> Este enlace expirará en <strong>1 hora</strong> y solo puede utilizarse una vez. Si no solicitaste este cambio, puedes ignorar este mensaje; tu cuenta continuará protegida.
      </div>

      <p style="font-size: 13px; color: #64748b;">Si el botón no funciona, copia y pega el siguiente enlace directamente en tu navegador:</p>
      <div class="fallback-url">${enlaceRestablecer}</div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Dirección General de Medicamentos, Alimentos y Productos Sanitarios (DIGEMAPS). Todos los derechos reservados.</p>
      <p>Este es un correo automático del sistema, por favor no respondas a este remitente.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.enviarCorreo({
      para,
      asunto,
      html,
    });
  }
}
