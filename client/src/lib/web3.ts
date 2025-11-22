import { ethers, BrowserProvider } from 'ethers';

export interface WalletConnection {
  address: string;
  ensName?: string;
  provider: BrowserProvider;
  walletType: 'metamask' | 'phantom' | 'walletconnect' | 'generic';
}

declare global {
  interface Window {
    ethereum?: any;
    phantom?: {
      ethereum?: any;
    };
  }
}

export class Web3Service {
  private provider: BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connectMetaMask(): Promise<WalletConnection> {
    // Require real MetaMask connection - no demo mode
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to connect your wallet.');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      let ensName: string | undefined;
      
      try {
        ensName = await this.provider.lookupAddress(address) || undefined;
      } catch (error) {
        console.warn('ENS lookup failed:', error);
      }

      return {
        address,
        ensName,
        provider: this.provider,
        walletType: 'metamask'
      };
    } catch (error) {
      console.error('MetaMask connection failed:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        throw new Error('Wallet connection was rejected. Please try again and approve the connection.');
      }
      throw new Error('Failed to connect to MetaMask. Please ensure MetaMask is unlocked and try again.');
    }
  }

  async connectSolana(): Promise<WalletConnection> {
    // Check for Solana wallet (Phantom)
    const solana = (window as any).solana;
    
    if (!solana || !solana.isPhantom) {
      throw new Error('Phantom wallet is not installed. Please install Phantom to connect your Solana wallet.');
    }

    try {
      // Request connection to Phantom
      const response = await solana.connect();
      
      // For Solana, we'll use the public key as the address
      const address = response.publicKey.toString();
      
      // Create a mock provider for Solana (since we're using ethers for EVM)
      const mockProvider = {
        getNetwork: () => Promise.resolve({ chainId: 101, name: 'solana' }),
        getSigner: () => Promise.resolve({
          getAddress: () => Promise.resolve(address),
          signMessage: (message: string) => solana.signMessage(new TextEncoder().encode(message))
        })
      } as any;

      this.provider = mockProvider;
      this.signer = await mockProvider.getSigner();

      return {
        address,
        provider: mockProvider,
        walletType: 'phantom'
      };
    } catch (error) {
      console.error('Solana connection failed:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        throw new Error('Wallet connection was rejected. Please try again and approve the connection.');
      }
      throw new Error('Failed to connect to Phantom wallet. Please ensure Phantom is unlocked and try again.');
    }
  }

  async connectWalletConnect(): Promise<WalletConnection> {
    // Try to detect available wallets and connect to the first available one
    const ethereum = window.ethereum || window.phantom?.ethereum;
    
    if (ethereum) {
      // Check if Phantom is available (multiple ways to detect)
      const isPhantom = ethereum.isPhantom || 
                       ethereum.isConnected?.toString().includes('Phantom') ||
                       (window.phantom && window.phantom.ethereum);
      
      if (isPhantom) {
        try {
          await ethereum.request({ method: 'eth_requestAccounts' });
          
          this.provider = new ethers.BrowserProvider(ethereum);
          this.signer = await this.provider.getSigner();
          
          const address = await this.signer.getAddress();
          let ensName: string | undefined;
          
          try {
            ensName = await this.provider.lookupAddress(address) || undefined;
          } catch (error) {
            console.warn('ENS lookup failed:', error);
          }

          return {
            address,
            ensName,
            provider: this.provider,
            walletType: 'phantom'
          };
        } catch (error) {
          console.error('Phantom connection failed:', error);
          if (error instanceof Error && error.message.includes('User rejected')) {
            throw new Error('Wallet connection was rejected. Please try again and approve the connection.');
          }
          throw new Error('Failed to connect to Phantom wallet. Please ensure Phantom is unlocked and try again.');
        }
      }
      
      // Try generic ethereum wallet connection
      try {
        await ethereum.request({ method: 'eth_requestAccounts' });
        
        this.provider = new ethers.BrowserProvider(ethereum);
        this.signer = await this.provider.getSigner();
        
        const address = await this.signer.getAddress();
        let ensName: string | undefined;
        
        try {
          ensName = await this.provider.lookupAddress(address) || undefined;
        } catch (error) {
          console.warn('ENS lookup failed:', error);
        }

        return {
          address,
          ensName,
          provider: this.provider,
          walletType: 'generic'
        };
      } catch (error) {
        console.error('Generic wallet connection failed:', error);
        if (error instanceof Error && error.message.includes('User rejected')) {
          throw new Error('Wallet connection was rejected. Please try again and approve the connection.');
        }
        throw new Error('Failed to connect to wallet. Please ensure your wallet is unlocked and try again.');
      }
    }
    
    throw new Error('No wallet detected. Please install MetaMask, Phantom, or another compatible wallet.');
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    return this.signer.signMessage(message);
  }

  async getNetwork() {
    if (!this.provider) {
      throw new Error('No provider available');
    }
    return this.provider.getNetwork();
  }

  isConnected(): boolean {
    return !!this.provider && !!this.signer;
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
  }

  getProvider() {
    return this.provider;
  }

  getSigner() {
    return this.signer;
  }
}

export const web3Service = new Web3Service();
