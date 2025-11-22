import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './use-wallet';
import { enhancedStakingSystem, type StakingPosition, type PollStakingInfo } from '@/lib/enhanced-staking-system';

export function useEnhancedStaking() {
  const { walletAddress } = useWallet();
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Stake tokens for a poll option
  const stakeForPoll = useCallback(async (
    pollId: string,
    option: number,
    amount: number,
    transactionHash?: string
  ) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    setIsStaking(true);
    try {
      const success = await enhancedStakingSystem.stakeForPoll(
        pollId,
        walletAddress,
        option,
        amount,
        transactionHash
      );
      
      if (success) {
        // Trigger balance refresh
        window.dispatchEvent(new CustomEvent('vskBalanceUpdated'));
      }
      
      return success;
    } finally {
      setIsStaking(false);
    }
  }, [walletAddress]);

  // Unstake tokens from a poll
  const unstakeFromPoll = useCallback(async (
    pollId: string,
    positionIndex: number
  ) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    setIsUnstaking(true);
    try {
      const success = await enhancedStakingSystem.unstakeFromPoll(
        pollId,
        walletAddress,
        positionIndex
      );
      
      if (success) {
        // Trigger balance refresh
        window.dispatchEvent(new CustomEvent('vskBalanceUpdated'));
      }
      
      return success;
    } finally {
      setIsUnstaking(false);
    }
  }, [walletAddress]);

  // Claim rewards for a staking position
  const claimRewards = useCallback(async (
    pollId: string,
    positionIndex: number
  ) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    setIsClaiming(true);
    try {
      const rewardAmount = await enhancedStakingSystem.claimRewards(
        pollId,
        walletAddress,
        positionIndex
      );
      
      // Trigger balance refresh
      window.dispatchEvent(new CustomEvent('vskBalanceUpdated'));
      
      return rewardAmount;
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress]);

  // Resolve poll (admin function)
  const resolvePoll = useCallback(async (
    pollId: string,
    correctOption: number
  ) => {
    setIsResolving(true);
    try {
      await enhancedStakingSystem.resolvePoll(pollId, correctOption);
    } finally {
      setIsResolving(false);
    }
  }, []);

  // Get user's staking positions for a poll
  const getUserStakingPositions = useCallback((pollId: string): StakingPosition[] => {
    if (!walletAddress) return [];
    return enhancedStakingSystem.getUserStakingPositions(pollId, walletAddress);
  }, [walletAddress]);

  // Get poll staking information
  const getPollStakingInfo = useCallback((pollId: string): PollStakingInfo | null => {
    return enhancedStakingSystem.getPollStakingInfo(pollId);
  }, []);

  // Get all polls user has staked in
  const getUserStakedPolls = useCallback((): string[] => {
    if (!walletAddress) return [];
    return enhancedStakingSystem.getUserStakedPolls(walletAddress);
  }, [walletAddress]);

  // Get total staked amount by user
  const getTotalStakedByUser = useCallback((): number => {
    if (!walletAddress) return 0;
    return enhancedStakingSystem.getTotalStakedByUser(walletAddress);
  }, [walletAddress]);

  // Get total rewards earned by user
  const getTotalRewardsEarned = useCallback((): number => {
    if (!walletAddress) return 0;
    return enhancedStakingSystem.getTotalRewardsEarned(walletAddress);
  }, [walletAddress]);

  // Get staking statistics
  const getStakingStats = useCallback(() => {
    return enhancedStakingSystem.getStakingStats();
  }, []);

  // Check if user has staked in a poll
  const hasUserStakedInPoll = useCallback((pollId: string): boolean => {
    if (!walletAddress) return false;
    const positions = getUserStakingPositions(pollId);
    return positions.length > 0;
  }, [walletAddress, getUserStakingPositions]);

  // Get user's stake for a specific option in a poll
  const getUserStakeForOption = useCallback((pollId: string, option: number): number => {
    if (!walletAddress) return 0;
    const positions = getUserStakingPositions(pollId);
    return positions
      .filter(p => p.option === option && !p.isClaimed)
      .reduce((sum, p) => sum + p.stakeAmount, 0);
  }, [walletAddress, getUserStakingPositions]);

  // Check if user can claim rewards for a poll
  const canUserClaimRewards = useCallback((pollId: string): boolean => {
    if (!walletAddress) return false;
    const positions = getUserStakingPositions(pollId);
    const pollInfo = getPollStakingInfo(pollId);
    
    if (!pollInfo?.isResolved || !pollInfo.correctOption) return false;
    
    return positions.some(p => 
      p.option === pollInfo.correctOption && 
      !p.isClaimed && 
      p.rewardAmount && 
      p.rewardAmount > 0
    );
  }, [walletAddress, getUserStakingPositions, getPollStakingInfo]);

  // Get total claimable rewards for a poll
  const getTotalClaimableRewards = useCallback((pollId: string): number => {
    if (!walletAddress) return 0;
    const positions = getUserStakingPositions(pollId);
    const pollInfo = getPollStakingInfo(pollId);
    
    if (!pollInfo?.isResolved || !pollInfo.correctOption) return 0;
    
    return positions
      .filter(p => p.option === pollInfo.correctOption && !p.isClaimed && p.rewardAmount)
      .reduce((sum, p) => sum + (p.rewardAmount || 0), 0);
  }, [walletAddress, getUserStakingPositions, getPollStakingInfo]);

  return {
    // State
    isStaking,
    isUnstaking,
    isClaiming,
    isResolving,
    
    // Actions
    stakeForPoll,
    unstakeFromPoll,
    claimRewards,
    resolvePoll,
    
    // Getters
    getUserStakingPositions,
    getPollStakingInfo,
    getUserStakedPolls,
    getTotalStakedByUser,
    getTotalRewardsEarned,
    getStakingStats,
    hasUserStakedInPoll,
    getUserStakeForOption,
    canUserClaimRewards,
    getTotalClaimableRewards,
  };
}
