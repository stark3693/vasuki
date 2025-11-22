import CryptoJS from 'crypto-js';

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

export class ClientEncryption {
  private static readonly ALGORITHM = CryptoJS.algo.AES;
  private static readonly KEY_SIZE = 256;
  private static readonly IV_SIZE = 128;

  /**
   * Generate a random encryption key
   */
  static generateRandomKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
  }

  /**
   * Encrypt data using AES-256
   */
  static encryptData(data: string, key: string): EncryptedData {
    try {
      const keyWordArray = CryptoJS.enc.Base64.parse(key);
      const iv = CryptoJS.lib.WordArray.random(16);
      
      const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return {
        data: encrypted.toString(),
        nonce: iv.toString(CryptoJS.enc.Base64),
        publicKey: '',
        signature: this.generateSignature(data, key)
      };
    } catch (error) {
      console.error('Client encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256
   */
  static decryptData(encryptedData: EncryptedData, key: string): string {
    try {
      const keyWordArray = CryptoJS.enc.Base64.parse(key);
      const iv = CryptoJS.enc.Base64.parse(encryptedData.nonce);
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Client decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate signature for data integrity
   */
  private static generateSignature(data: string, key: string): string {
    return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Base64);
  }

  /**
   * Verify signature
   */
  static verifySignature(data: string, signature: string, key: string): boolean {
    const computedSignature = this.generateSignature(data, key);
    return computedSignature === signature;
  }

  /**
   * Encrypt chat message for multiple recipients
   */
  static encryptChatMessage(message: string, recipientKeys: string[]): EncryptedData[] {
    const encryptedMessages: EncryptedData[] = [];
    
    for (const recipientKey of recipientKeys) {
      try {
        const encrypted = this.encryptData(message, recipientKey);
        encryptedMessages.push(encrypted);
      } catch (error) {
        console.error('Failed to encrypt for recipient:', error);
      }
    }
    
    return encryptedMessages;
  }

  /**
   * Decrypt chat message
   */
  static decryptChatMessage(encryptedMessage: EncryptedData, userKey: string): string {
    try {
      return this.decryptData(encryptedMessage, userKey);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message');
    }
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
   * Hash data for integrity
   */
  static hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Encrypt file data
   */
  static encryptFile(fileData: string, key: string): string {
    const keyWordArray = CryptoJS.enc.Base64.parse(key);
    const iv = CryptoJS.lib.WordArray.random(16);
    
    const encrypted = CryptoJS.AES.encrypt(fileData, keyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return JSON.stringify({
      data: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Base64)
    });
  }

  /**
   * Decrypt file data
   */
  static decryptFile(encryptedData: string, key: string): string {
    const { data, iv } = JSON.parse(encryptedData);
    const keyWordArray = CryptoJS.enc.Base64.parse(key);
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);
    
    const decrypted = CryptoJS.AES.decrypt(data, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generate encryption key from password
   */
  static generateKeyFromPassword(password: string, salt?: string): string {
    const saltWordArray = salt ? CryptoJS.enc.Base64.parse(salt) : CryptoJS.lib.WordArray.random(16);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32,
      iterations: 10000
    });
    
    return key.toString(CryptoJS.enc.Base64);
  }

  /**
   * Secure random string generation
   */
  static generateSecureRandom(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Base64);
  }
}

// Export individual functions for compatibility
export const generateKeyPair = () => {
  const publicKey = ClientEncryption.generateSecureRandom(32);
  const privateKey = ClientEncryption.generateSecureRandom(32);
  const secretKey = ClientEncryption.generateSecureRandom(32);
  return { publicKey, privateKey, secretKey };
};

export const encryptData = (data: string, key: string) => {
  return ClientEncryption.encryptData(data, key);
};

export const decryptData = (encryptedData: any, key: string) => {
  return ClientEncryption.decryptData(encryptedData, key);
};

export const encryptUserData = (data: any, userKey: string) => {
  return ClientEncryption.encryptUserData(data, userKey);
};

export const decryptUserData = (encryptedData: string, userKey: string) => {
  return ClientEncryption.decryptUserData(encryptedData, userKey);
};

export const encryptTextContent = (content: string, key: string) => {
  return ClientEncryption.encryptData(content, key);
};

export const decryptTextContent = (encryptedContent: any, key: string) => {
  return ClientEncryption.decryptData(encryptedContent, key);
};

export const encryptJSONData = (data: any, key: string) => {
  return ClientEncryption.encryptUserData(data, key);
};

export const decryptJSONData = (encryptedData: string, key: string) => {
  return ClientEncryption.decryptUserData(encryptedData, key);
};

export const isEncrypted = (data: any): boolean => {
  return data && typeof data === 'object' && 'data' in data && 'nonce' in data;
};

export default ClientEncryption;