import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { blockchainService, WalletInfo } from '../lib/blockchain-service';

interface WalletContextType {
  walletInfo: WalletInfo | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: () => Promise<string>;
  sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
  formatEther: (wei: string) => string;
  parseEther: (ether: string) => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!walletInfo;

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const info = await blockchainService.getWalletInfo();
        if (info) {
          setWalletInfo(info);
        }
      } catch (error) {
        console.log('No wallet connected');
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await blockchainService.connectWallet();
      setWalletInfo(info);
    } catch (error: any) {
      setError(error.message);
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await blockchainService.disconnect();
      setWalletInfo(null);
      setError(null);
    } catch (error: any) {
      setError(error.message);
      console.error('Error disconnecting wallet:', error);
    }
  };

  const switchNetwork = async (chainId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await blockchainService.switchNetwork(chainId);
      
      // Refresh wallet info after network switch
      const info = await blockchainService.getWalletInfo();
      if (info) {
        setWalletInfo(info);
      }
    } catch (error: any) {
      setError(error.message);
      console.error('Error switching network:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = async (): Promise<string> => {
    try {
      return await blockchainService.getBalance();
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const sendTransaction = async (to: string, value: string, data?: string): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const txHash = await blockchainService.sendTransaction({
        to,
        value,
        data
      });
      
      return txHash;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const formatEther = (wei: string): string => {
    return blockchainService.formatEther(wei);
  };

  const parseEther = (ether: string): string => {
    return blockchainService.parseEther(ether);
  };

  const value: WalletContextType = {
    walletInfo,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
    sendTransaction,
    formatEther,
    parseEther
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
