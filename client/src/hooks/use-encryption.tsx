import { useCallback } from 'react';
import { useWallet } from './use-wallet';
import { 
  encryptUserData, 
  decryptUserData, 
  encryptTextContent, 
  decryptTextContent,
  encryptJSONData,
  decryptJSONData,
  isEncrypted,
  type EncryptionResult
} from '../lib/encryption';

export function useEncryption() {
  const { walletAddress } = useWallet();

  const encryptData = useCallback((data: string): EncryptionResult => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    return encryptUserData(data, walletAddress);
  }, [walletAddress]);

  const decryptData = useCallback((encryptedData: string, iv: string, salt: string): string => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    const result = decryptUserData(encryptedData, walletAddress, iv, salt);
    return result.success ? result.decryptedData : '';
  }, [walletAddress]);

  const encryptText = useCallback((text: string): EncryptionResult => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    return encryptTextContent(text, walletAddress);
  }, [walletAddress]);

  const decryptText = useCallback((encryptedContent: any): string => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    return decryptTextContent(encryptedContent, walletAddress);
  }, [walletAddress]);

  const encryptJSON = useCallback((data: any): EncryptionResult => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    return encryptJSONData(data, walletAddress);
  }, [walletAddress]);

  const decryptJSON = useCallback((encryptedData: string, iv: string, salt: string): any => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    const result = decryptJSONData(encryptedData, walletAddress, iv, salt);
    return result.success ? result.decryptedData : null;
  }, [walletAddress]);

  const isDataEncrypted = useCallback((data: any): boolean => {
    return isEncrypted(data);
  }, []);

  return {
    encryptData,
    decryptData,
    encryptText,
    decryptText,
    encryptJSON,
    decryptJSON,
    isDataEncrypted,
    isEncryptionAvailable: !!walletAddress
  };
}
