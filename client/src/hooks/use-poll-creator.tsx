import { useState, useCallback } from 'react';
import { useWalletWeb3 } from './use-wallet-web3';
import { useWallet } from './use-wallet';
import { CONTRACT_ADDRESSES, PREDICTION_POLL_ABI } from '@/lib/web3-config';
import { parseEther, formatEther } from 'viem';
import { toast } from './use-toast';

interface CreatorFeeInfo {
  creatorFeePercent: number;
  creatorHasClaimed: boolean;
  totalStaked: string;
  creatorFeeAmount: string;
}

export function usePollCreator() {
  const { address, isConnected } = useWalletWeb3();
  const { walletAddress } = useWallet();
  const [isClaimingStacks, setIsClaimingStacks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Claim stacks (creator fee) from a resolved poll
   * @param pollId Poll ID to claim stacks from
   */
  const claimStacks = useCallback(async (pollId: number): Promise<boolean> => {
    if (!address && !walletAddress) {
      throw new Error('Wallet not connected');
    }

    const userAddress = address || walletAddress;
    if (!userAddress) {
      throw new Error('No wallet address available');
    }

    setIsClaimingStacks(true);
    try {
      // Check if we have a real contract configured
      const hasRealContract = CONTRACT_ADDRESSES.PREDICTION_POLL && 
        CONTRACT_ADDRESSES.PREDICTION_POLL !== '0x0000000000000000000000000000000000000000';

      if (hasRealContract) {
        // Use real blockchain interaction
        const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi');
        const { writeContractAsync, data: hash } = useWriteContract();
        const { isLoading: isPending, isSuccess } = useWaitForTransactionReceipt({
          hash,
        });

        await writeContractAsync({
          address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
          abi: PREDICTION_POLL_ABI,
          functionName: 'claimStacks',
          args: [BigInt(pollId)],
        });

        // Wait for transaction confirmation
        if (isPending) {
          toast({
            title: 'Transaction Pending',
            description: 'Please wait for the transaction to be confirmed...',
          });
        }

        if (isSuccess) {
          toast({
            title: '🎉 Stacks Claimed Successfully!',
            description: 'You have successfully claimed your creator fee from the poll.',
          });
          return true;
        }

        return false;
      } else {
        // Fallback for non-Web3 mode (local simulation)
        toast({
          title: '⚠️ Local Mode',
          description: 'Creator fee claiming is simulated in local mode. In production, this would interact with the smart contract.',
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to claim stacks:', error);
      
      let errorMessage = 'Failed to claim stacks. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Only poll creator')) {
          errorMessage = 'Only the poll creator can claim stacks.';
        } else if (error.message.includes('Creator has already claimed')) {
          errorMessage = 'You have already claimed stacks from this poll.';
        } else if (error.message.includes('Poll not resolved')) {
          errorMessage = 'Poll must be resolved before claiming stacks.';
        } else if (error.message.includes('No tokens staked')) {
          errorMessage = 'No tokens were staked on this poll.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Claim Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsClaimingStacks(false);
    }
  }, [address, walletAddress]);

  /**
   * Get creator fee information for a poll
   * @param pollId Poll ID to get fee info for
   */
  const getCreatorFeeInfo = useCallback(async (pollId: number): Promise<CreatorFeeInfo | null> => {
    if (!address && !walletAddress) {
      return null;
    }

    const userAddress = address || walletAddress;
    if (!userAddress) {
      return null;
    }

    setIsLoading(true);
    try {
      // Check if we have a real contract configured
      const hasRealContract = CONTRACT_ADDRESSES.PREDICTION_POLL && 
        CONTRACT_ADDRESSES.PREDICTION_POLL !== '0x0000000000000000000000000000000000000000';

      if (hasRealContract) {
        // Use real blockchain interaction
        const { useReadContract } = await import('wagmi');
        const { data } = useReadContract({
          address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
          abi: PREDICTION_POLL_ABI,
          functionName: 'getCreatorFeeInfo',
          args: [BigInt(pollId)],
        });

        if (data) {
          const [creatorFeePercent, creatorHasClaimed, totalStaked, creatorFeeAmount] = data as [bigint, boolean, bigint, bigint];
          
          return {
            creatorFeePercent: Number(creatorFeePercent),
            creatorHasClaimed,
            totalStaked: formatEther(totalStaked),
            creatorFeeAmount: formatEther(creatorFeeAmount),
          };
        }
      } else {
        // Fallback for non-Web3 mode (mock data)
        return {
          creatorFeePercent: 500, // 5% default
          creatorHasClaimed: false,
          totalStaked: '100.0',
          creatorFeeAmount: '5.0',
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get creator fee info:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletAddress]);

  /**
   * Check if user is the creator of a poll
   * @param pollCreator Poll creator address
   */
  const isPollCreator = useCallback((pollCreator: string): boolean => {
    const userAddress = address || walletAddress;
    if (!userAddress) return false;
    return userAddress.toLowerCase() === pollCreator.toLowerCase();
  }, [address, walletAddress]);

  /**
   * Check if user can claim stacks from a poll
   * @param pollId Poll ID
   * @param pollCreator Poll creator address
   * @param isResolved Whether poll is resolved
   * @param creatorHasClaimed Whether creator has already claimed
   */
  const canClaimStacks = useCallback(async (
    pollId: number, 
    pollCreator: string, 
    isResolved: boolean, 
    creatorHasClaimed: boolean
  ): Promise<boolean> => {
    if (!isPollCreator(pollCreator) || !isResolved || creatorHasClaimed) {
      return false;
    }

    try {
      const feeInfo = await getCreatorFeeInfo(pollId);
      return feeInfo ? parseFloat(feeInfo.creatorFeeAmount) > 0 : false;
    } catch (error) {
      console.error('Error checking if can claim stacks:', error);
      return false;
    }
  }, [isPollCreator, getCreatorFeeInfo]);

  return {
    claimStacks,
    getCreatorFeeInfo,
    isPollCreator,
    canClaimStacks,
    isClaimingStacks,
    isLoading,
  };
}
