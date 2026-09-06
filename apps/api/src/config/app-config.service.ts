import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Envoltorio tipado sobre ConfigService.
 * Centraliza el acceso a variables de entorno para evitar `process.env` disperso
 * por el código (fuente común de fugas de secretos y errores de tipeo).
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private require(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(
        `Variable de entorno requerida ausente: ${key}. Revise su archivo .env`,
      );
    }
    return value;
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return Number(this.config.get<string>('PORT', '3000'));
  }

  get forceHttps(): boolean {
    return this.config.get<string>('FORCE_HTTPS', 'true') === 'true';
  }

  get trustProxy(): boolean {
    return this.config.get<string>('TRUST_PROXY', 'true') === 'true';
  }

  get databaseUrl(): string {
    return this.require('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.require('JWT_ACCESS_SECRET');
  }

  get jwtAccessExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  get jwtRefreshSecret(): string {
    return this.require('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get cookieSecret(): string {
    return this.require('COOKIE_SECRET');
  }

  get cookieDomain(): string {
    return this.config.get<string>('COOKIE_DOMAIN', 'localhost');
  }

  get dataEncryptionKey(): string {
    const key = this.require('DATA_ENCRYPTION_KEY');
    if (Buffer.from(key, 'hex').length !== 32) {
      throw new Error(
        'DATA_ENCRYPTION_KEY debe ser una cadena hexadecimal de 32 bytes (64 caracteres hex).',
      );
    }
    return key;
  }

  get allowedOrigins(): string[] {
    return this.require('ALLOWED_ORIGINS').split(',').map((o) => o.trim());
  }

  get redisUrl(): string {
    return this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  get loginMaxAttempts(): number {
    return Number(this.config.get<string>('LOGIN_MAX_ATTEMPTS', '5'));
  }

  get loginLockMinutes(): number {
    return Number(this.config.get<string>('LOGIN_LOCK_MINUTES', '15'));
  }

  get maxFileSizeBytes(): number {
    return Number(this.config.get<string>('MAX_FILE_SIZE_MB', '15')) * 1024 * 1024;
  }

  get allowedFileMimeTypes(): string[] {
    return this.require('ALLOWED_FILE_MIME_TYPES')
      .split(',')
      .map((m) => m.trim());
  }

  get storageLocalPath(): string {
    return this.config.get<string>('STORAGE_LOCAL_PATH', './storage/uploads');
  }
}
