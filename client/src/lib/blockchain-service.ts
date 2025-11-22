import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
    env?: {
    };
  }
}

export interface WalletInfo {
  address: string;
  balance: string;
  network: string;
  chainId: number;
}

export interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}


class BlockchainService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private walletInfo: WalletInfo | null = null;

  private readonly SUPPORTED_NETWORKS = {
    1: { name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID' },
    5: { name: 'Goerli Testnet', rpc: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID' },
    137: { name: 'Polygon Mainnet', rpc: 'https://polygon-rpc.com' },
    80001: { name: 'Mumbai Testnet', rpc: 'https://rpc-mumbai.maticvigil.com' }
  };

  async connectWallet(): Promise<WalletInfo> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Get wallet info
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();
      
      this.walletInfo = {
        address,
        balance: ethers.utils.formatEther(balance),
        network: network.name,
        chainId: network.chainId
      };

      // Initialize contract
      this.contract = new ethers.Contract(
        this.CONTRACT_ADDRESS,
        this.CONTRACT_ABI,
        this.signer
      );

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.connectWallet();
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId: string) => {
        window.location.reload();
      });

      return this.walletInfo;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.walletInfo = null;
  }

  async switchNetwork(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  private async addNetwork(chainId: number): Promise<void> {
    const network = this.SUPPORTED_NETWORKS[chainId as keyof typeof this.SUPPORTED_NETWORKS];
    if (!network) {
      throw new Error(`Unsupported network: ${chainId}`);
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: network.name,
        rpcUrls: [network.rpc],
        nativeCurrency: {
          name: chainId === 137 || chainId === 80001 ? 'MATIC' : 'ETH',
          symbol: chainId === 137 || chainId === 80001 ? 'MATIC' : 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: [
          chainId === 137 ? 'https://polygonscan.com' :
          chainId === 80001 ? 'https://mumbai.polygonscan.com' :
          chainId === 5 ? 'https://goerli.etherscan.io' :
          'https://etherscan.io'
        ],
      }],
    });
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    return this.walletInfo;
  }

  async getBalance(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    const balance = await this.signer.getBalance();
    return ethers.utils.formatEther(balance);
  }

  async estimateGas(transaction: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const gasEstimate = await this.provider.estimateGas({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
    });

    return gasEstimate.toString();
  }

  async getGasPrice(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const gasPrice = await this.provider.getGasPrice();
    return gasPrice.toString();
  }

  async sendTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.signer.sendTransaction({
      to: transaction.to,
      value: ethers.utils.parseEther(transaction.value),
      data: transaction.data,
      gasLimit: transaction.gasLimit,
      gasPrice: transaction.gasPrice,
    });

    return tx.hash;
  }

  async waitForTransaction(txHash: string): Promise<ethers.providers.TransactionReceipt> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    return await this.provider.waitForTransaction(txHash);
  }




  async getHighestBid(tokenId: string): Promise<{ bidder: string; amount: string }> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const bid = await this.contract.getHighestBid(tokenId);
    return {
      bidder: bid.bidder,
      amount: ethers.utils.formatEther(bid.amount)
    };
  }

  async getStakingInfo(tokenId: string): Promise<{ staker: string; stakedAt: number; duration: number; rewards: string }> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const staking = await this.contract.getStakingInfo(tokenId);
    return {
      staker: staking.staker,
      stakedAt: staking.stakedAt.toNumber(),
      duration: staking.duration.toNumber(),
      rewards: ethers.utils.formatEther(staking.rewards)
    };
  }

  // Event listeners



  // Utility methods
  formatEther(wei: string): string {
    return ethers.utils.formatEther(wei);
  }

  parseEther(ether: string): string {
    return ethers.utils.parseEther(ether).toString();
  }

  formatUnits(value: string, unit: string): string {
    return ethers.utils.formatUnits(value, unit);
  }

  parseUnits(value: string, unit: string): string {
    return ethers.utils.parseUnits(value, unit).toString();
  }

  isAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }

  getAddress(address: string): string {
    return ethers.utils.getAddress(address);
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;
