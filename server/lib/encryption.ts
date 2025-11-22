import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import nacl from 'tweetnacl';
import * as forge from 'node-forge';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  secretKey: string;
}

export interface EncryptedData {
  data: string;
  nonce: string;
  publicKey: string;
  signature?: string;
}

export class EndToEndEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate a new key pair for a user
   */
  static generateKeyPair(): EncryptionKeys {
    const keyPair = nacl.box.keyPair();
    
    return {
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.secretKey).toString('base64'),
      secretKey: Buffer.from(keyPair.secretKey).toString('base64')
    };
  }

  /**
   * Generate a random encryption key
   */
  static generateRandomKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('base64');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encryptData(data: string, key: string): EncryptedData {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      return {
        data: encrypted,
        nonce: iv.toString('base64'),
        publicKey: '', // Will be set by caller
        signature: authTag.toString('base64')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decryptData(encryptedData: EncryptedData, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = Buffer.from(encryptedData.nonce, 'base64');
      const authTag = Buffer.from(encryptedData.signature || '', 'base64');
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt chat message for specific recipients
   */
  static encryptChatMessage(message: string, senderPrivateKey: string, recipientPublicKeys: string[]): EncryptedData[] {
    const encryptedMessages: EncryptedData[] = [];
    
    for (const recipientPublicKey of recipientPublicKeys) {
      try {
        // Generate a random key for this message
        const messageKey = this.generateRandomKey();
        
        // Encrypt the message
        const encrypted = this.encryptData(message, messageKey);
        
        // Encrypt the message key with recipient's public key
        const encryptedKey = this.encryptWithPublicKey(messageKey, recipientPublicKey);
        
        encryptedMessages.push({
          data: encrypted.data,
          nonce: encrypted.nonce,
          publicKey: encryptedKey,
          signature: encrypted.signature
        });
      } catch (error) {
        console.error('Failed to encrypt for recipient:', error);
        // Continue with other recipients
      }
    }
    
    return encryptedMessages;
  }

  /**
   * Decrypt chat message using recipient's private key
   */
  static decryptChatMessage(encryptedMessage: EncryptedData, recipientPrivateKey: string): string {
    try {
      // Decrypt the message key
      const messageKey = this.decryptWithPrivateKey(encryptedMessage.publicKey, recipientPrivateKey);
      
      // Decrypt the message
      return this.decryptData(encryptedMessage, messageKey);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encrypt with public key (RSA)
   */
  private static encryptWithPublicKey(data: string, publicKey: string): string {
    try {
      const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
      const encrypted = publicKeyObj.encrypt(data, 'RSA-OAEP');
      return forge.util.encode64(encrypted);
    } catch (error) {
      console.error('RSA encryption error:', error);
      throw new Error('Failed to encrypt with public key');
    }
  }

  /**
   * Decrypt with private key (RSA)
   */
  private static decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    try {
      const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
      const encrypted = forge.util.decode64(encryptedData);
      return privateKeyObj.decrypt(encrypted, 'RSA-OAEP');
    } catch (error) {
      console.error('RSA decryption error:', error);
      throw new Error('Failed to decrypt with private key');
    }
  }

  /**
   * Generate RSA key pair
   */
  static generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    return {
      publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
    };
  }

  /**
   * Hash data for integrity checking
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity
   */
  static verifyIntegrity(data: string, hash: string): boolean {
    const computedHash = this.hashData(data);
    return computedHash === hash;
  }

  /**
   * Encrypt user data
   */
  static encryptUserData(data: any, userKey: string): string {
    const jsonData = JSON.stringify(data);
    const encrypted = this.encryptData(jsonData, userKey);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt user data
   */
  static decryptUserData(encryptedData: string, userKey: string): any {
    const encrypted = JSON.parse(encryptedData);
    const decrypted = this.decryptData(encrypted, userKey);
    return JSON.parse(decrypted);
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Encrypt file data
   */
  static encryptFile(fileBuffer: Buffer, key: string): Buffer {
    const keyBuffer = Buffer.from(key, 'base64');
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, keyBuffer);
    
    const encrypted = Buffer.concat([
      iv,
      cipher.update(fileBuffer),
      cipher.final(),
      cipher.getAuthTag()
    ]);
    
    return encrypted;
  }

  /**
   * Decrypt file data
   */
  static decryptFile(encryptedBuffer: Buffer, key: string): Buffer {
    const keyBuffer = Buffer.from(key, 'base64');
    const iv = encryptedBuffer.slice(0, this.IV_LENGTH);
    const authTag = encryptedBuffer.slice(-this.TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(this.IV_LENGTH, -this.TAG_LENGTH);
    
    const decipher = crypto.createDecipher(this.ALGORITHM, keyBuffer);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  }
}

export default EndToEndEncryption;
