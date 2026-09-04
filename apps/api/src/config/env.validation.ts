import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsNumberString,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Valida las variables de entorno al arrancar la aplicación.
 * Si falta o es inválida una variable crítica, el proceso NO arranca
 * (falla rápido, en vez de arrancar en un estado inseguro/indefinido).
 */
class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsNumberString()
  PORT: string;

  @IsString()
  @MinLength(20)
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @MinLength(32)
  COOKIE_SECRET: string;

  @IsString()
  @MinLength(64, { message: 'DATA_ENCRYPTION_KEY debe ser hex de 32 bytes (64 chars)' })
  DATA_ENCRYPTION_KEY: string;

  @IsString()
  ALLOWED_ORIGINS: string;

  @IsBooleanString()
  FORCE_HTTPS: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join(' | ');
    throw new Error(`Configuración de entorno inválida: ${details}`);
  }
  return validatedConfig;
}
