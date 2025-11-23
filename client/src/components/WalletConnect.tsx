import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface WalletConnectProps {
  className?: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ className }) => {
  const { 
    walletInfo, 
    isConnected, 
    isLoading, 
    error, 
    connect, 
    disconnect, 
    switchNetwork,
    getBalance 
  } = useWallet();
  
  const [balance, setBalance] = useState<string>('0');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully!",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet.",
        variant: "destructive",
      });
    }
  };

  const handleSwitchNetwork = async (chainId: number) => {
    try {
      await switchNetwork(chainId);
      toast({
        title: "Network Switched",
        description: "Network has been switched successfully!",
      });
    } catch (error) {
      toast({
        title: "Network Switch Failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshBalance = async () => {
    if (!isConnected) return;
    
    try {
      setIsRefreshing(true);
      const newBalance = await getBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyAddress = () => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard!",
      });
    }
  };

  const openExplorer = () => {
    if (walletInfo?.address) {
      const explorerUrl = walletInfo.chainId === 137 
        ? `https://polygonscan.com/address/${walletInfo.address}`
        : walletInfo.chainId === 80001
        ? `https://mumbai.polygonscan.com/address/${walletInfo.address}`
        : walletInfo.chainId === 5
        ? `https://goerli.etherscan.io/address/${walletInfo.address}`
        : `https://etherscan.io/address/${walletInfo.address}`;
      
      window.open(explorerUrl, '_blank');
    }
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet';
      case 5: return 'Goerli Testnet';
      case 137: return 'Polygon Mainnet';
      case 80001: return 'Mumbai Testnet';
      default: return `Chain ${chainId}`;
    }
  };

  const getNetworkColor = (chainId: number) => {
    switch (chainId) {
      case 1: return 'bg-blue-500';
      case 5: return 'bg-blue-400';
      case 137: return 'bg-purple-500';
      case 80001: return 'bg-purple-400';
      default: return 'bg-gray-500';
    }
  };

  if (isConnected && walletInfo) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Wallet Connected
          </CardTitle>
          <CardDescription>
            Your wallet is connected and ready for transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono">
                {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openExplorer}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Network</label>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getNetworkColor(walletInfo.chainId)} text-white`}
              >
                {getNetworkName(walletInfo.chainId)}
              </Badge>
              {walletInfo.chainId !== 137 && walletInfo.chainId !== 80001 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwitchNetwork(137)}
                  disabled={isLoading}
                  className=""
                >
                  Switch to Polygon
                </Button>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Balance</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className=""
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <span className="text-lg font-semibold">
                {parseFloat(balance).toFixed(4)} {walletInfo.chainId === 137 || walletInfo.chainId === 80001 ? 'MATIC' : 'ETH'}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex-1"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Connect your wallet to start trading NFTs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          <p>Supported wallets: MetaMask, WalletConnect, Coinbase Wallet</p>
          <p>Supported networks: Ethereum, Polygon, Goerli, Mumbai</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletConnect;
