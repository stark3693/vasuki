import { vskTokenSystem } from './vsk-token-system';
import { ENV_CONFIG } from '../config/env';

// Enhanced Staking System for Prediction Polls
export interface StakingPosition {
  pollId: string;
  userAddress: string;
  option: number;
  stakeAmount: number;
  timestamp: number;
  isClaimed: boolean;
  rewardAmount?: number;
  transactionHash?: string;
}

export interface PollStakingInfo {
  pollId: string;
  totalStaked: number;
  optionStakes: { [option: number]: number };
  userStakes: { [userAddress: string]: StakingPosition[] };
  isResolved: boolean;
  correctOption?: number;
  rewardPool: number;
}

export class EnhancedStakingSystem {
  private static instance: EnhancedStakingSystem;
  private stakingPositions: Map<string, StakingPosition[]> = new Map();
  private pollStakingInfo: Map<string, PollStakingInfo> = new Map();
  private readonly STORAGE_KEY = 'vasukii_enhanced_staking';

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): EnhancedStakingSystem {
    if (!EnhancedStakingSystem.instance) {
      EnhancedStakingSystem.instance = new EnhancedStakingSystem();
    }
    return EnhancedStakingSystem.instance;
  }

  // Load staking data from localStorage
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        this.stakingPositions = new Map(data.stakingPositions || []);
        this.pollStakingInfo = new Map(data.pollStakingInfo || []);
      }
    } catch (error) {
      console.error('Error loading staking data from storage:', error);
    }
  }

  // Save staking data to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        stakingPositions: Array.from(this.stakingPositions.entries()),
        pollStakingInfo: Array.from(this.pollStakingInfo.entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving staking data to storage:', error);
    }
  }

  // Stake tokens for a specific poll option
  async stakeForPoll(
    pollId: string, 
    userAddress: string, 
    option: number, 
    amount: number,
    transactionHash?: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!pollId || !userAddress || option < 0 || amount <= 0) {
        throw new Error('Invalid staking parameters');
      }

      // Check user has sufficient balance
      const userBalance = vskTokenSystem.getBalance(userAddress);
      if (userBalance < amount) {
        throw new Error(`Insufficient balance: ${userBalance} < ${amount}`);
      }

      // Create staking position
      const position: StakingPosition = {
        pollId,
        userAddress,
        option,
        stakeAmount: amount,
        timestamp: Date.now(),
        isClaimed: false,
        transactionHash
      };

      // Add to user's staking positions
      const userKey = `${userAddress}_${pollId}`;
      const userPositions = this.stakingPositions.get(userKey) || [];
      userPositions.push(position);
      this.stakingPositions.set(userKey, userPositions);

      // Update poll staking info
      let pollInfo = this.pollStakingInfo.get(pollId);
      if (!pollInfo) {
        pollInfo = {
          pollId,
          totalStaked: 0,
          optionStakes: {},
          userStakes: {},
          isResolved: false,
          rewardPool: 0
        };
      }

      pollInfo.totalStaked += amount;
      pollInfo.optionStakes[option] = (pollInfo.optionStakes[option] || 0) + amount;
      
      if (!pollInfo.userStakes[userAddress]) {
        pollInfo.userStakes[userAddress] = [];
      }
      pollInfo.userStakes[userAddress].push(position);

      this.pollStakingInfo.set(pollId, pollInfo);

      // Deduct tokens from user's balance
      const success = vskTokenSystem.deductTokens(userAddress, amount);
      if (!success) {
        throw new Error('Failed to deduct tokens from user balance');
      }

      // Save to storage
      this.saveToStorage();

      console.log(`✅ Staked ${amount} VSK tokens for poll ${pollId}, option ${option}`);
      
      // Trigger staking event
      window.dispatchEvent(new CustomEvent('tokensStaked', {
        detail: {
          pollId,
          userAddress,
          option,
          amount,
          timestamp: position.timestamp
        }
      }));

      return true;
    } catch (error) {
      console.error('Error staking tokens:', error);
      throw error;
    }
  }

  // Unstake tokens (only if poll is not resolved)
  async unstakeFromPoll(
    pollId: string, 
    userAddress: string, 
    positionIndex: number
  ): Promise<boolean> {
    try {
      const userKey = `${userAddress}_${pollId}`;
      const userPositions = this.stakingPositions.get(userKey);
      
      if (!userPositions || !userPositions[positionIndex]) {
        throw new Error('Staking position not found');
      }

      const position = userPositions[positionIndex];
      
      // Check if poll is resolved
      const pollInfo = this.pollStakingInfo.get(pollId);
      if (pollInfo?.isResolved) {
        throw new Error('Cannot unstake from resolved poll');
      }

      // Check if position is already claimed
      if (position.isClaimed) {
        throw new Error('Position already claimed');
      }

      // Return tokens to user
      const success = vskTokenSystem.transfer('contract', userAddress, position.stakeAmount);
      if (!success) {
        throw new Error('Failed to return tokens to user');
      }

      // Remove position
      userPositions.splice(positionIndex, 1);
      if (userPositions.length === 0) {
        this.stakingPositions.delete(userKey);
      } else {
        this.stakingPositions.set(userKey, userPositions);
      }

      // Update poll info
      if (pollInfo) {
        pollInfo.totalStaked -= position.stakeAmount;
        pollInfo.optionStakes[position.option] -= position.stakeAmount;
        if (pollInfo.optionStakes[position.option] <= 0) {
          delete pollInfo.optionStakes[position.option];
        }
        
        pollInfo.userStakes[userAddress] = userPositions;
        this.pollStakingInfo.set(pollId, pollInfo);
      }

      this.saveToStorage();

      console.log(`🔄 Unstaked ${position.stakeAmount} VSK tokens from poll ${pollId}`);
      return true;
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      throw error;
    }
  }

  // Resolve poll and calculate rewards
  async resolvePoll(
    pollId: string, 
    correctOption: number
  ): Promise<void> {
    try {
      const pollInfo = this.pollStakingInfo.get(pollId);
      if (!pollInfo) {
        throw new Error('Poll not found');
      }

      if (pollInfo.isResolved) {
        throw new Error('Poll already resolved');
      }

      // Mark poll as resolved
      pollInfo.isResolved = true;
      pollInfo.correctOption = correctOption;
      pollInfo.rewardPool = pollInfo.totalStaked;

      // Calculate rewards for correct stakers
      const correctStakes = pollInfo.optionStakes[correctOption] || 0;
      
      if (correctStakes > 0) {
        // Calculate reward multiplier (total pool / correct stakes)
        const rewardMultiplier = pollInfo.totalStaked / correctStakes;
        console.log(`🎯 Poll ${pollId} reward calculation: totalStaked=${pollInfo.totalStaked}, correctStakes=${correctStakes}, rewardMultiplier=${rewardMultiplier}`);

        // Update all staking positions with rewards
        const entries = Array.from(this.stakingPositions.entries());
        for (const [userKey, positions] of entries) {
          if (userKey.endsWith(`_${pollId}`)) {
            positions.forEach((position, index) => {
              if (position.option === correctOption && !position.isClaimed) {
                position.rewardAmount = position.stakeAmount * rewardMultiplier;
                console.log(`💰 Position ${index} for user ${userKey}: stake=${position.stakeAmount}, reward=${position.rewardAmount}`);
              }
            });
          }
        }
      } else {
        console.log(`⚠️ Poll ${pollId} has no correct stakes, no rewards to distribute`);
      }

      this.pollStakingInfo.set(pollId, pollInfo);
      this.saveToStorage();

      console.log(`🎯 Poll ${pollId} resolved. Correct option: ${correctOption}`);
      
      // Trigger resolution event
      window.dispatchEvent(new CustomEvent('pollResolved', {
        detail: {
          pollId,
          correctOption,
          totalRewards: pollInfo.rewardPool,
          correctStakes
        }
      }));

    } catch (error) {
      console.error('Error resolving poll:', error);
      throw error;
    }
  }

  // Claim rewards for a specific staking position
  async claimRewards(
    pollId: string, 
    userAddress: string, 
    positionIndex: number
  ): Promise<number> {
    try {
      const userKey = `${userAddress}_${pollId}`;
      const userPositions = this.stakingPositions.get(userKey);
      
      if (!userPositions || !userPositions[positionIndex]) {
        throw new Error('Staking position not found');
      }

      const position = userPositions[positionIndex];
      const pollInfo = this.pollStakingInfo.get(pollId);

      if (!pollInfo?.isResolved) {
        throw new Error('Poll not resolved yet');
      }

      if (position.isClaimed) {
        throw new Error('Rewards already claimed');
      }

      if (position.option !== pollInfo.correctOption) {
        throw new Error('Cannot claim rewards for incorrect option');
      }

      if (!position.rewardAmount || position.rewardAmount <= 0) {
        throw new Error('No rewards available for this position');
      }

      // Transfer rewards to user
      console.log(`💰 Attempting to transfer ${position.rewardAmount} VSK tokens to ${userAddress}`);
      const success = vskTokenSystem.transfer('contract', userAddress, position.rewardAmount);
      if (!success) {
        console.error(`❌ Failed to transfer ${position.rewardAmount} VSK tokens to ${userAddress}`);
        throw new Error('Failed to transfer rewards');
      }
      console.log(`✅ Successfully transferred ${position.rewardAmount} VSK tokens to ${userAddress}`);

      // Mark position as claimed
      position.isClaimed = true;
      this.saveToStorage();

      console.log(`💰 Claimed ${position.rewardAmount} VSK rewards for poll ${pollId}`);
      
      // Trigger claim event
      window.dispatchEvent(new CustomEvent('rewardsClaimed', {
        detail: {
          pollId,
          userAddress,
          rewardAmount: position.rewardAmount,
          positionIndex
        }
      }));

      return position.rewardAmount;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }

  // Get user's staking positions for a poll
  getUserStakingPositions(pollId: string, userAddress: string): StakingPosition[] {
    const userKey = `${userAddress}_${pollId}`;
    return this.stakingPositions.get(userKey) || [];
  }

  // Get poll staking information
  getPollStakingInfo(pollId: string): PollStakingInfo | null {
    return this.pollStakingInfo.get(pollId) || null;
  }

  // Get all polls user has staked in
  getUserStakedPolls(userAddress: string): string[] {
    const polls = new Set<string>();
    const keys = Array.from(this.stakingPositions.keys());
    for (const key of keys) {
      if (key.startsWith(`${userAddress}_`)) {
        const pollId = key.split('_').slice(1).join('_');
        polls.add(pollId);
      }
    }
    return Array.from(polls);
  }

  // Get total staked amount by user across all polls
  getTotalStakedByUser(userAddress: string): number {
    let total = 0;
    const values = Array.from(this.stakingPositions.values());
    for (const positions of values) {
      for (const position of positions) {
        if (position.userAddress === userAddress && !position.isClaimed) {
          total += position.stakeAmount;
        }
      }
    }
    return total;
  }

  // Get total rewards earned by user
  getTotalRewardsEarned(userAddress: string): number {
    let total = 0;
    const values = Array.from(this.stakingPositions.values());
    for (const positions of values) {
      for (const position of positions) {
        if (position.userAddress === userAddress && position.isClaimed && position.rewardAmount) {
          total += position.rewardAmount;
        }
      }
    }
    return total;
  }

  // Clear all staking data (for testing)
  clearAllData(): void {
    this.stakingPositions.clear();
    this.pollStakingInfo.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Get staking statistics
  getStakingStats() {
    const totalPolls = this.pollStakingInfo.size;
    const totalPositions = Array.from(this.stakingPositions.values()).reduce(
      (sum, positions) => sum + positions.length, 0
    );
    const totalStaked = Array.from(this.pollStakingInfo.values()).reduce(
      (sum, poll) => sum + poll.totalStaked, 0
    );
    const resolvedPolls = Array.from(this.pollStakingInfo.values()).filter(
      poll => poll.isResolved
    ).length;

    return {
      totalPolls,
      totalPositions,
      totalStaked,
      resolvedPolls,
      activePolls: totalPolls - resolvedPolls
    };
  }
}

// Export singleton instance
export const enhancedStakingSystem = EnhancedStakingSystem.getInstance();
