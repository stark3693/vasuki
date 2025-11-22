import { ClientEncryption } from './encryption';

export interface EncryptionConfig {
  enabled: boolean;
  autoEncrypt: boolean;
  keyRotation: boolean;
}

export interface UserEncryptionKeys {
  publicKey: string;
  privateKey: string;
  secretKey: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private config: EncryptionConfig;
  private userKeys: UserEncryptionKeys | null = null;
  private encryptionEnabled: boolean = false;

  private constructor() {
    this.config = {
      enabled: true,
      autoEncrypt: true,
      keyRotation: false
    };
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption service
   */
  public async initialize(userId: string): Promise<void> {
    try {
      // Check if user has encryption keys
      const keys = await this.getUserEncryptionKeys(userId);
      if (!keys) {
        // Generate new keys for user
        await this.generateUserKeys(userId);
      } else {
        this.userKeys = keys;
      }
      
      this.encryptionEnabled = true;
      console.log('🔐 Encryption service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize encryption service:', error);
      this.encryptionEnabled = false;
    }
  }

  /**
   * Get user encryption keys from server
   */
  private async getUserEncryptionKeys(userId: string): Promise<UserEncryptionKeys | null> {
    try {
      const response = await fetch(`/api/users/${userId}/encryption-keys`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get user encryption keys:', error);
      return null;
    }
  }

  /**
   * Generate new encryption keys for user
   */
  private async generateUserKeys(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/users/${userId}/generate-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        this.userKeys = await response.json();
        console.log('🔐 Generated new encryption keys for user');
      } else {
        throw new Error('Failed to generate encryption keys');
      }
    } catch (error) {
      console.error('Failed to generate user keys:', error);
      throw error;
    }
  }

  /**
   * Encrypt chat message
   */
  public async encryptChatMessage(message: string, recipientIds: string[]): Promise<any> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Get recipient public keys
      const recipientKeys = await this.getRecipientKeys(recipientIds);
      
      // Encrypt message for each recipient
      const encryptedMessages = ClientEncryption.encryptChatMessage(message, recipientKeys);
      
      return encryptedMessages;
    } catch (error) {
      console.error('Failed to encrypt chat message:', error);
      throw error;
    }
  }

  /**
   * Decrypt chat message
   */
  public async decryptChatMessage(encryptedMessage: any): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      return ClientEncryption.decryptChatMessage(encryptedMessage, this.userKeys.secretKey);
    } catch (error) {
      console.error('Failed to decrypt chat message:', error);
      return '[Encrypted message - decryption failed]';
    }
  }

  /**
   * Encrypt vask content
   */
  public async encryptVaskContent(content: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      return ClientEncryption.encryptUserData({ content }, this.userKeys.secretKey);
    } catch (error) {
      console.error('Failed to encrypt vask content:', error);
      throw error;
    }
  }

  /**
   * Decrypt vask content
   */
  public async decryptVaskContent(encryptedContent: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decrypted = ClientEncryption.decryptUserData(encryptedContent, this.userKeys.secretKey);
      return decrypted.content;
    } catch (error) {
      console.error('Failed to decrypt vask content:', error);
      return '[Encrypted content - decryption failed]';
    }
  }

  /**
   * Encrypt comment content
   */
  public async encryptCommentContent(content: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      return ClientEncryption.encryptUserData({ content }, this.userKeys.secretKey);
    } catch (error) {
      console.error('Failed to encrypt comment content:', error);
      throw error;
    }
  }

  /**
   * Decrypt comment content
   */
  public async decryptCommentContent(encryptedContent: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decrypted = ClientEncryption.decryptUserData(encryptedContent, this.userKeys.secretKey);
      return decrypted.content;
    } catch (error) {
      console.error('Failed to decrypt comment content:', error);
      return '[Encrypted comment - decryption failed]';
    }
  }

  /**
   * Get recipient public keys
   */
  private async getRecipientKeys(recipientIds: string[]): Promise<string[]> {
    try {
      const keys = await Promise.all(
        recipientIds.map(async (id) => {
          const response = await fetch(`/api/users/${id}/public-key`);
          if (response.ok) {
            const data = await response.json();
            return data.publicKey;
          }
          return null;
        })
      );
      
      return keys.filter(key => key !== null);
    } catch (error) {
      console.error('Failed to get recipient keys:', error);
      return [];
    }
  }

  /**
   * Check if encryption is enabled
   */
  public isEncryptionEnabled(): boolean {
    return this.encryptionEnabled;
  }

  /**
   * Get encryption status
   */
  public getEncryptionStatus(): { enabled: boolean; hasKeys: boolean } {
    return {
      enabled: this.encryptionEnabled,
      hasKeys: this.userKeys !== null
    };
  }

  /**
   * Update encryption configuration
   */
  public updateConfig(config: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): EncryptionConfig {
    return { ...this.config };
  }

  /**
   * Generate secure password
   */
  public generateSecurePassword(length: number = 32): string {
    return ClientEncryption.generateSecurePassword(length);
  }

  /**
   * Hash data for integrity
   */
  public hashData(data: string): string {
    return ClientEncryption.hashData(data);
  }

  /**
   * Encrypt file data
   */
  public async encryptFile(fileData: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      return ClientEncryption.encryptFile(fileData, this.userKeys.secretKey);
    } catch (error) {
      console.error('Failed to encrypt file:', error);
      throw error;
    }
  }

  /**
   * Decrypt file data
   */
  public async decryptFile(encryptedData: string): Promise<string> {
    if (!this.encryptionEnabled || !this.userKeys) {
      throw new Error('Encryption not initialized');
    }

    try {
      return ClientEncryption.decryptFile(encryptedData, this.userKeys.secretKey);
    } catch (error) {
      console.error('Failed to decrypt file:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
export default encryptionService;
