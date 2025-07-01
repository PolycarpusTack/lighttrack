import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { app } from 'electron';
import { logger } from '../../utils/logger';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

export interface EncryptionOptions {
  algorithm?: string;
  keyDerivationIterations?: number;
}

/**
 * Service for encrypting and decrypting sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private constructor() {
    this.key = this.deriveKey();
    logger.info('Encryption service initialized');
  }

  /**
   * Derive encryption key from machine-specific data
   */
  private deriveKey(): Buffer {
    try {
      // Use machine ID + user ID for key derivation
      const machineId = this.getMachineId();
      const userId = os.userInfo().username;
      const appName = app.getName();
      
      // Create a salt from machine-specific data
      const salt = `${appName}_${machineId}_${userId}`;
      const secret = process.env.LIGHTTRACK_SECRET || 'lighttrack_default_secret_change_in_production';
      
      // Derive key using PBKDF2
      return crypto.pbkdf2Sync(secret, salt, this.keyDerivationIterations, 32, 'sha256');
    } catch (error) {
      logger.error('Failed to derive encryption key:', error);
      throw new Error('Failed to initialize encryption');
    }
  }

  /**
   * Get machine identifier for key derivation
   */
  private getMachineId(): string {
    try {
      // Try to get machine ID from various sources
      const networkInterfaces = os.networkInterfaces();
      const macAddresses: string[] = [];
      
      Object.values(networkInterfaces).forEach(interfaces => {
        interfaces?.forEach(iface => {
          if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
            macAddresses.push(iface.mac);
          }
        });
      });
      
      if (macAddresses.length > 0) {
        return crypto.createHash('sha256').update(macAddresses.join('')).digest('hex');
      }
      
      // Fallback to hostname + platform
      return crypto.createHash('sha256')
        .update(`${os.hostname()}_${os.platform()}_${os.arch()}`)
        .digest('hex');
    } catch (error) {
      logger.warn('Failed to get machine ID, using fallback');
      return crypto.createHash('sha256').update('fallback_machine_id').digest('hex');
    }
  }

  /**
   * Encrypt a string and return encrypted data with IV and auth tag
   */
  encrypt(text: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(data: EncryptedData): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        this.key, 
        Buffer.from(data.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an object to JSON
   */
  encryptObject(obj: any): EncryptedData {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt JSON back to object
   */
  decryptObject<T = any>(data: EncryptedData): T {
    const jsonString = this.decrypt(data);
    return JSON.parse(jsonString);
  }

  /**
   * Encrypt a file
   */
  async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        
        // Write IV to beginning of file
        output.write(iv);
        
        input.pipe(cipher).pipe(output);
        
        output.on('finish', () => {
          logger.debug('File encrypted successfully', { inputPath, outputPath });
          resolve();
        });
        
        output.on('error', (error) => {
          logger.error('File encryption failed:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('File encryption setup failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Decrypt a file
   */
  async decryptFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);
        
        // Read IV from beginning of file
        const ivBuffer = Buffer.alloc(16);
        let ivRead = false;
        
        input.on('data', (chunk) => {
          if (!ivRead) {
            chunk.copy(ivBuffer, 0, 0, 16);
            ivRead = true;
            
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, ivBuffer);
            
            // Pipe the rest of the data (after IV) through decipher
            const remainingData = chunk.slice(16);
            if (remainingData.length > 0) {
              decipher.write(remainingData);
            }
            
            input.pipe(decipher).pipe(output);
          }
        });
        
        output.on('finish', () => {
          logger.debug('File decrypted successfully', { inputPath, outputPath });
          resolve();
        });
        
        output.on('error', (error) => {
          logger.error('File decryption failed:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('File decryption setup failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate a random salt
   */
  generateSalt(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a password with salt
   */
  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || this.generateSalt();
    const hash = crypto.pbkdf2Sync(password, actualSalt, this.keyDerivationIterations, 64, 'sha256');
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const { hash: computedHash } = this.hashPassword(password, salt);
      return computedHash === hash;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  createHMAC(data: string, secret?: string): string {
    const hmacSecret = secret || this.key;
    return crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Securely wipe sensitive data from memory
   */
  wipeBuffer(buffer: Buffer): void {
    if (buffer && Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }

  /**
   * Test encryption/decryption functionality
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = 'This is a test message for encryption validation';
      
      // Test string encryption
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('String encryption test failed');
      }
      
      // Test object encryption
      const testObject = { test: true, number: 42, nested: { value: 'hello' } };
      const encryptedObj = this.encryptObject(testObject);
      const decryptedObj = this.decryptObject(encryptedObj);
      
      if (JSON.stringify(decryptedObj) !== JSON.stringify(testObject)) {
        throw new Error('Object encryption test failed');
      }
      
      logger.info('Encryption service test passed');
      return true;
    } catch (error) {
      logger.error('Encryption service test failed:', error);
      return false;
    }
  }

  /**
   * Get encryption service status
   */
  getStatus(): { initialized: boolean; algorithm: string; keyDerivationIterations: number } {
    return {
      initialized: !!this.key,
      algorithm: this.algorithm,
      keyDerivationIterations: this.keyDerivationIterations
    };
  }

  /**
   * Dispose of sensitive resources
   */
  dispose(): void {
    if (this.key) {
      this.wipeBuffer(this.key);
    }
    logger.info('Encryption service disposed');
  }
}