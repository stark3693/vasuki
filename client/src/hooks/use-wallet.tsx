import { createContext, useContext, useState, useEffect } from 'react';
import { web3Service, type WalletConnection } from '@/lib/web3';
import { useIndexedDB } from './use-indexeddb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { blockchainIntegration } from '@/lib/blockchain-integration';
import type { User } from '@shared/schema';

interface WalletContextType {
  isConnected: boolean;
  user: User | null;
  walletAddress: string | null;
  ensName: string | null;
  walletType: 'metamask' | 'phantom' | 'walletconnect' | 'generic' | null;
  connectMetaMask: () => Promise<void>;
  connectSolana: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'metamask' | 'phantom' | 'walletconnect' | 'generic' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { isReady: isDbReady, getItem, setItem, removeItem } = useIndexedDB();
  const queryClient = useQueryClient();

  // Function to welcome new users
  const welcomeNewUser = async (walletAddress: string) => {
    if (!walletAddress) return;
    
    try {
      console.log(`🎉 Welcome new user: ${walletAddress}`);
      
      // Show welcome toast
      const { useToast } = await import('@/hooks/use-toast');
      const { toast } = useToast();
      toast({
        title: '🎉 Welcome to Vasukii!',
        description: `Welcome to the prediction poll platform!`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error welcoming new user:', error);
    }
  };

  const authMutation = useMutation({
    mutationFn: async (connection: WalletConnection) => {
      const response = await apiRequest('POST', '/api/auth/wallet', {
        walletAddress: connection.address,
        ensName: connection.ensName
      });
      return response.json();
    },
    onSuccess: async (data) => {
      setUser(data.user);
      setItem('user', data.user);
      queryClient.setQueryData(['/api/users', data.user.id], data.user);
      
      // Welcome new users
      try {
        await welcomeNewUser(data.user.walletAddress);
      } catch (error) {
        console.warn('Failed to welcome new user:', error);
        // Don't throw error - user can still use the app
      }
    }
  });

  const connectMetaMask = async () => {
    setIsConnecting(true);
    try {
      const connection = await web3Service.connectMetaMask();
      setWalletAddress(connection.address);
      setEnsName(connection.ensName || null);
      setIsConnected(true);
      
      await setItem('walletConnection', {
        address: connection.address,
        ensName: connection.ensName,
        provider: 'metamask'
      });

      // Refresh blockchain chain detection after wallet connection
      try {
        const { blockchainIntegration } = await import('@/lib/blockchain-integration');
        await blockchainIntegration.refreshChainDetection();
      } catch (error) {
        console.warn('Failed to refresh chain detection:', error);
      }

      await authMutation.mutateAsync(connection);
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectSolana = async () => {
    setIsConnecting(true);
    try {
      const connection = await web3Service.connectSolana();
      setWalletAddress(connection.address);
      setEnsName(connection.ensName || null);
      setWalletType(connection.walletType);
      setIsConnected(true);
      
      await setItem('walletConnection', {
        address: connection.address,
        ensName: connection.ensName,
        provider: 'phantom',
        walletType: connection.walletType
      });

      // Refresh blockchain chain detection after wallet connection
      try {
        const { blockchainIntegration } = await import('@/lib/blockchain-integration');
        await blockchainIntegration.refreshChainDetection();
      } catch (error) {
        console.warn('Failed to refresh chain detection:', error);
      }

      await authMutation.mutateAsync(connection);
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWalletConnect = async () => {
    setIsConnecting(true);
    try {
      const connection = await web3Service.connectWalletConnect();
      setWalletAddress(connection.address);
      setEnsName(connection.ensName || null);
      setWalletType(connection.walletType);
      setIsConnected(true);
      
      await setItem('walletConnection', {
        address: connection.address,
        ensName: connection.ensName,
        provider: 'walletconnect'
      });

      // Refresh blockchain chain detection after wallet connection
      try {
        const { blockchainIntegration } = await import('@/lib/blockchain-integration');
        await blockchainIntegration.refreshChainDetection();
      } catch (error) {
        console.warn('Failed to refresh chain detection:', error);
      }

      await authMutation.mutateAsync(connection);
    } catch (error) {
      console.error('Failed to connect WalletConnect:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    web3Service.disconnect();
    setIsConnected(false);
    setUser(null);
    setWalletAddress(null);
    setEnsName(null);
    setWalletType(null);
    
    await removeItem('walletConnection');
    await removeItem('user');
    
    queryClient.clear();
  };

  // Auto-connect on app load
  useEffect(() => {
    const autoConnect = async () => {
      if (!isDbReady) return; // Wait for database to be ready
      
      try {
        const savedConnection = await getItem<{address: string; ensName?: string; provider: string}>('walletConnection');
        const savedUser = await getItem<User>('user');
        
        if (savedConnection && savedUser) {
          setWalletAddress(savedConnection.address);
          setEnsName(savedConnection.ensName || null);
          setWalletType((savedConnection as any).walletType || null);
          setUser(savedUser);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };

    autoConnect();
  }, [isDbReady, getItem]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        user,
        walletAddress,
        ensName,
        walletType,
        connectMetaMask,
        connectSolana,
        connectWalletConnect,
        disconnect,
        isConnecting: isConnecting || authMutation.isPending,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
