import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AppConfigService } from '../../config/app-config.service';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

/**
 * Cifrado simétrico para datos sensibles en reposo (ej. secretos MFA,
 * números de documento si se requiere cifrarlos más allá del hash de
 * búsqueda). Usa AES-256-GCM (cifrado autenticado): cualquier manipulación
 * del texto cifrado se detecta al descifrar.
 *
 * La clave nunca vive en el código: viene de DATA_ENCRYPTION_KEY (.env),
 * idealmente respaldada por un KMS/secrets manager en producción.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: AppConfigService) {
    this.key = Buffer.from(config.dataEncryptionKey, 'hex');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Formato: iv.authTag.ciphertext, todo en base64
    return [iv, authTag, encrypted].map((b) => b.toString('base64')).join('.');
  }

  decrypt(cipherText: string): string {
    const [ivB64, authTagB64, dataB64] = cipherText.split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
