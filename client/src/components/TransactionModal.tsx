import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { blockchainService } from '../lib/blockchain-service';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  AlertTriangle,
  Zap,
  Clock
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  transactionType: 'buy' | 'sell' | 'bid' | 'stake' | 'unstake' | 'create';
  nftId?: string;
  nftName?: string;
  nftPrice?: string;
  onSuccess?: (txHash: string) => void;
}

interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
  gasEstimate: string | null;
  gasPrice: string | null;
  totalCost: string | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  transactionType,
  nftId,
  nftName,
  nftPrice,
  onSuccess
}) => {
  const { walletInfo, isConnected, sendTransaction, formatEther, parseEther } = useWallet();
  const [transactionState, setTransactionState] = useState<TransactionState>({
    status: 'idle',
    txHash: null,
    error: null,
    gasEstimate: null,
    gasPrice: null,
    totalCost: null
  });
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isConnected) {
      estimateGas();
    }
  }, [isOpen, isConnected, transactionType, nftId, nftPrice]);

  const estimateGas = async () => {
    try {
      const gasEstimate = await blockchainService.estimateGas({
        to: blockchainService.CONTRACT_ADDRESS,
        value: nftPrice || '0',
        data: getTransactionData()
      });
      
      const gasPrice = await blockchainService.getGasPrice();
      const totalCost = formatEther(
        (BigInt(gasEstimate) * BigInt(gasPrice)).toString()
      );

      setTransactionState(prev => ({
        ...prev,
        gasEstimate,
        gasPrice,
        totalCost
      }));
    } catch (error) {
      console.error('Error estimating gas:', error);
    }
  };

  const getTransactionData = (): string => {
    // This would contain the encoded function call data
    // For now, return empty string as placeholder
    return '';
  };

  const handleTransaction = async () => {
    if (!isConnected || !walletInfo) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to proceed with the transaction.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setTransactionState(prev => ({ ...prev, status: 'pending', error: null }));

      let txHash: string;

      switch (transactionType) {
        case 'buy':
          if (!nftId || !nftPrice) throw new Error('Missing NFT ID or price');
          txHash = await blockchainService.buyNFT(nftId, nftPrice);
          break;
        case 'sell':
          if (!nftId || !customAmount) throw new Error('Missing NFT ID or price');
          txHash = await blockchainService.listNFT(nftId, customAmount);
          break;
        case 'bid':
          if (!nftId || !customAmount) throw new Error('Missing NFT ID or bid amount');
          txHash = await blockchainService.placeBid(nftId, customAmount);
          break;
        case 'stake':
          if (!nftId) throw new Error('Missing NFT ID');
          const duration = parseInt(customAmount) || 30;
          txHash = await blockchainService.stakeNFT(nftId, duration);
          break;
        case 'unstake':
          if (!nftId) throw new Error('Missing NFT ID');
          txHash = await blockchainService.unstakeNFT(nftId);
          break;
        case 'create':
          if (!customAmount) throw new Error('Missing price');
          txHash = await blockchainService.createNFT('', customAmount);
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      setTransactionState(prev => ({ 
        ...prev, 
        status: 'success', 
        txHash 
      }));

      toast({
        title: "Transaction Submitted",
        description: "Your transaction has been submitted to the blockchain.",
      });

      onSuccess?.(txHash);

    } catch (error: any) {
      setTransactionState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));

      toast({
        title: "Transaction Failed",
        description: error.message || "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openExplorer = () => {
    if (transactionState.txHash) {
      const explorerUrl = walletInfo?.chainId === 137 
        ? `https://polygonscan.com/tx/${transactionState.txHash}`
        : walletInfo?.chainId === 80001
        ? `https://mumbai.polygonscan.com/tx/${transactionState.txHash}`
        : walletInfo?.chainId === 5
        ? `https://goerli.etherscan.io/tx/${transactionState.txHash}`
        : `https://etherscan.io/tx/${transactionState.txHash}`;
      
      window.open(explorerUrl, '_blank');
    }
  };

  const getTransactionTitle = () => {
    switch (transactionType) {
      case 'buy': return `Buy ${nftName || 'NFT'}`;
      case 'sell': return `List ${nftName || 'NFT'} for Sale`;
      case 'bid': return `Place Bid on ${nftName || 'NFT'}`;
      case 'stake': return `Stake ${nftName || 'NFT'}`;
      case 'unstake': return `Unstake ${nftName || 'NFT'}`;
      case 'create': return 'Create NFT';
      default: return 'Transaction';
    }
  };

  const getAmountLabel = () => {
    switch (transactionType) {
      case 'sell': return 'Listing Price (ETH)';
      case 'bid': return 'Bid Amount (ETH)';
      case 'stake': return 'Staking Duration (Days)';
      case 'create': return 'Initial Price (ETH)';
      default: return 'Amount (ETH)';
    }
  };

  const getAmountPlaceholder = () => {
    switch (transactionType) {
      case 'sell': return '0.1';
      case 'bid': return '0.05';
      case 'stake': return '30';
      case 'create': return '0.01';
      default: return '0.0';
    }
  };

  const isAmountRequired = () => {
    return ['sell', 'bid', 'stake', 'create'].includes(transactionType);
  };

  const getTotalCost = () => {
    if (transactionType === 'buy' && nftPrice) {
      const price = parseFloat(nftPrice);
      const gas = parseFloat(transactionState.totalCost || '0');
      return (price + gas).toFixed(6);
    }
    return transactionState.totalCost || '0';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transactionState.status === 'pending' && <Loader2 className="h-5 w-5 animate-spin" />}
            {transactionState.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {transactionState.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {transactionState.status === 'idle' && <AlertTriangle className="h-5 w-5" />}
            {getTransactionTitle()}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          {nftName && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">NFT Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm font-medium">{nftName}</p>
                {nftPrice && (
                  <p className="text-sm text-muted-foreground">
                    Price: {nftPrice} {walletInfo?.chainId === 137 || walletInfo?.chainId === 80001 ? 'MATIC' : 'ETH'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Amount Input */}
          {isAmountRequired() && (
            <div className="space-y-2">
              <Label htmlFor="amount">{getAmountLabel()}</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                placeholder={getAmountPlaceholder()}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={transactionState.status === 'pending'}
              />
            </div>
          )}

          {/* Gas Estimation */}
          {transactionState.gasEstimate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Transaction Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Gas Estimate:</span>
                  <span className="font-mono">{transactionState.gasEstimate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gas Price:</span>
                  <span className="font-mono">
                    {transactionState.gasPrice ? formatEther(transactionState.gasPrice) : '0'} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Total Cost:</span>
                  <span className="font-mono">
                    {getTotalCost()} {walletInfo?.chainId === 137 || walletInfo?.chainId === 80001 ? 'MATIC' : 'ETH'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Status */}
          {transactionState.status === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Transaction is being processed. This may take a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {transactionState.status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Transaction successful! 
                <Button
                  variant="link"
                  size="sm"
                  onClick={openExplorer}
                  className="p-0 h-auto text-green-700"
                >
                  View on Explorer <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {transactionState.status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {transactionState.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={transactionState.status === 'pending'}
              className="flex-1"
            >
              {transactionState.status === 'success' ? 'Close' : 'Cancel'}
            </Button>
            
            {transactionState.status === 'idle' && (
              <Button
                onClick={handleTransaction}
                disabled={isLoading || (isAmountRequired() && !customAmount)}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Transaction'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;
