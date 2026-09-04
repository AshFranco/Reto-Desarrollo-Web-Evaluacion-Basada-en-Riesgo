import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Hashing de contraseñas con Argon2id (ganador del Password Hashing Competition,
 * recomendado sobre bcrypt para nuevos sistemas). Parámetros calibrados para
 * ~250-500ms por hash en hardware de servidor típico.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, this.options);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      // Hash corrupto o formato inesperado: tratar como no coincide, nunca lanzar.
      return false;
    }
  }
}
