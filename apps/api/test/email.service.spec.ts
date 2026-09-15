import { EmailService } from '../src/common/services/email.service';
import { AppConfigService } from '../src/config/app-config.service';

describe('EmailService', () => {
  let emailService: EmailService;
  let configMock: Partial<AppConfigService>;

  beforeEach(() => {
    configMock = {
      smtpHost: null,
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: null,
      smtpPass: null,
      smtpFrom: 'DIGEMAPS EBR/BPM <no-reply@digemaps.gob.do>',
    };

    emailService = new EmailService(configMock as AppConfigService);
  });

  it('se inicializa correctamente como servicio inyectable', () => {
    expect(emailService).toBeDefined();
  });

  it('enviarRecuperacionContrasena genera plantilla HTML con enlace y destinatario', async () => {
    const spyEnviar = jest.spyOn(emailService, 'enviarCorreo').mockResolvedValue({
      ok: true,
      messageId: 'msg-12345',
      previewUrl: 'https://ethereal.email/message/test-id',
    });

    const resultado = await emailService.enviarRecuperacionContrasena(
      'usuario@digemaps.gob.do',
      'Juan Evaluador',
      'http://localhost:5173/restablecer-contrasena?token=sample-token',
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.previewUrl).toBe('https://ethereal.email/message/test-id');
    expect(spyEnviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: 'usuario@digemaps.gob.do',
        asunto: expect.stringContaining('Restablecimiento de contraseña'),
        html: expect.stringContaining('http://localhost:5173/restablecer-contrasena?token=sample-token'),
      }),
    );
  });
});
