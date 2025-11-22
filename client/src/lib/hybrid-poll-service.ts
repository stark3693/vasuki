import { Address } from 'viem';
import { BlockchainPollService, BlockchainPoll } from './blockchain-poll-service';
import { publicPollStorage, PublicPoll } from './public-poll-storage';
import { Poll, PollStatus } from './web3-config';
import { isWalletConnectConfigured } from '../config/env';

export interface HybridPoll extends Poll {
  source: 'blockchain' | 'public';
  blockchainHash?: string;
  publicId?: number;
}

export class HybridPollService {
  private blockchainService: BlockchainPollService;
  private useBlockchain: boolean;

  constructor() {
    this.blockchainService = new BlockchainPollService(
      '0x0000000000000000000000000000000000000000' as Address,
      []
    );
    this.useBlockchain = isWalletConnectConfigured();
  }

  // Get all polls (from both blockchain and public storage)
  async getAllPolls(): Promise<HybridPoll[]> {
    const polls: HybridPoll[] = [];

    try {
      // Get polls from public storage (visible to ALL users worldwide)
      const publicPolls = publicPollStorage.getAllPublicPolls();
      const hybridPublicPolls: HybridPoll[] = publicPolls.map(publicPoll => ({
        id: publicPoll.id,
        creator: publicPoll.creator as Address,
        title: publicPoll.title,
        description: publicPoll.description,
        options: publicPoll.options,
        deadline: publicPoll.deadline,
        correctOption: publicPoll.correctOption,
        isResolved: publicPoll.isResolved,
        isStakingEnabled: publicPoll.isStakingEnabled,
        totalStaked: publicPoll.totalStaked,
        votes: publicPoll.votes,
        stakes: publicPoll.stakes,
        userVotes: publicPoll.userVotes,
        status: publicPoll.status,
        source: 'public' as const,
        publicId: publicPoll.id,
      }));
      polls.push(...hybridPublicPolls);

      // Get polls from blockchain if configured
      if (this.useBlockchain) {
        const blockchainPolls = await this.blockchainService.getAllPolls();
        const hybridBlockchainPolls: HybridPoll[] = blockchainPolls.map(blockchainPoll => ({
          id: blockchainPoll.id,
          creator: blockchainPoll.creator,
          title: blockchainPoll.title,
          description: blockchainPoll.description,
          options: blockchainPoll.options,
          deadline: blockchainPoll.deadline,
          correctOption: blockchainPoll.correctOption,
          isResolved: blockchainPoll.isResolved,
          isStakingEnabled: blockchainPoll.isStakingEnabled,
          totalStaked: blockchainPoll.totalStaked,
          votes: this.convertArrayToObject(blockchainPoll.optionVotes),
          stakes: this.convertArrayToStringObject(blockchainPoll.optionStaked),
          userVotes: {}, // Would need to be populated from blockchain events
          status: this.determineStatus(blockchainPoll),
          source: 'blockchain' as const,
          blockchainHash: undefined, // Would be populated from transaction hash
        }));
        polls.push(...hybridBlockchainPolls);
      }

      // Sort by creation time (newest first)
      return polls.sort((a, b) => {
        const aTime = a.source === 'public' ? 
          (publicPollStorage.getPublicPoll(a.publicId!)?.createdAt || 0) : 
          a.deadline;
        const bTime = b.source === 'public' ? 
          (publicPollStorage.getPublicPoll(b.publicId!)?.createdAt || 0) : 
          b.deadline;
        return bTime - aTime;
      });

    } catch (error) {
      console.error('Error getting hybrid polls:', error);
      // Fallback to public storage only
      return publicPollStorage.getAllPublicPolls().map(publicPoll => ({
        id: publicPoll.id,
        creator: publicPoll.creator as Address,
        title: publicPoll.title,
        description: publicPoll.description,
        options: publicPoll.options,
        deadline: publicPoll.deadline,
        correctOption: publicPoll.correctOption,
        isResolved: publicPoll.isResolved,
        isStakingEnabled: publicPoll.isStakingEnabled,
        totalStaked: publicPoll.totalStaked,
        votes: publicPoll.votes,
        stakes: publicPoll.stakes,
        userVotes: publicPoll.userVotes,
        status: publicPoll.status,
        source: 'public' as const,
        publicId: publicPoll.id,
      }));
    }
  }

  // Create poll (prefer blockchain, fallback to local)
  async createPoll(
    title: string,
    description: string,
    options: string[],
    deadline: number,
    isStakingEnabled: boolean,
    creator: Address
  ): Promise<HybridPoll | null> {
    try {
      // Try blockchain first if configured
      if (this.useBlockchain) {
        const blockchainResult = await this.blockchainService.createPoll(
          title, description, options, deadline, isStakingEnabled, creator
        );
        
        if (blockchainResult) {
          // Create public cache for faster access
          const publicPoll = publicPollStorage.createPublicPoll({
            creator,
            title,
            description,
            options,
            deadline,
            isStakingEnabled,
          });
          
          return {
            id: publicPoll.id,
            creator: publicPoll.creator as Address,
            title: publicPoll.title,
            description: publicPoll.description,
            options: publicPoll.options,
            deadline: publicPoll.deadline,
            correctOption: publicPoll.correctOption,
            isResolved: publicPoll.isResolved,
            isStakingEnabled: publicPoll.isStakingEnabled,
            totalStaked: publicPoll.totalStaked,
            votes: publicPoll.votes,
            stakes: publicPoll.stakes,
            userVotes: publicPoll.userVotes,
            status: publicPoll.status,
            source: 'blockchain',
            blockchainHash: blockchainResult.hash,
            publicId: publicPoll.id,
          };
        }
      }

      // Fallback to public storage (visible to ALL users worldwide)
      const publicPoll = publicPollStorage.createPublicPoll({
        creator,
        title,
        description,
        options,
        deadline,
        isStakingEnabled,
      });

      return {
        id: publicPoll.id,
        creator: publicPoll.creator as Address,
        title: publicPoll.title,
        description: publicPoll.description,
        options: publicPoll.options,
        deadline: publicPoll.deadline,
        correctOption: publicPoll.correctOption,
        isResolved: publicPoll.isResolved,
        isStakingEnabled: publicPoll.isStakingEnabled,
        totalStaked: publicPoll.totalStaked,
        votes: publicPoll.votes,
        stakes: publicPoll.stakes,
        userVotes: publicPoll.userVotes,
        status: publicPoll.status,
        source: 'public',
        publicId: publicPoll.id,
      };

    } catch (error) {
      console.error('Error creating hybrid poll:', error);
      return null;
    }
  }

  // Vote on poll
  async vote(
    pollId: number,
    option: number,
    stakeAmount: string,
    voter: Address
  ): Promise<boolean> {
    try {
      // Try blockchain first if configured
      if (this.useBlockchain) {
        const blockchainResult = await this.blockchainService.vote(
          pollId, option, stakeAmount, voter
        );
        
        if (blockchainResult) {
          // Update public cache
          publicPollStorage.voteOnPublicPoll(pollId, voter, option, stakeAmount);
          return true;
        }
      }

      // Fallback to public storage
      return publicPollStorage.voteOnPublicPoll(pollId, voter, option, stakeAmount);

    } catch (error) {
      console.error('Error voting on hybrid poll:', error);
      return false;
    }
  }

  // Resolve poll
  async resolvePoll(
    pollId: number,
    correctOption: number,
    resolver: Address
  ): Promise<boolean> {
    try {
      // Try blockchain first if configured
      if (this.useBlockchain) {
        const blockchainResult = await this.blockchainService.resolvePoll(
          pollId, correctOption, resolver
        );
        
        if (blockchainResult) {
          // Update public cache
          publicPollStorage.resolvePublicPoll(pollId, correctOption);
          return true;
        }
      }

      // Fallback to public storage
      return publicPollStorage.resolvePublicPoll(pollId, correctOption);

    } catch (error) {
      console.error('Error resolving hybrid poll:', error);
      return false;
    }
  }

  // Get poll by ID
  async getPoll(pollId: number): Promise<HybridPoll | null> {
    try {
      // Check public storage first (faster)
      const publicPoll = publicPollStorage.getPublicPoll(pollId);
      if (publicPoll) {
        return {
          id: publicPoll.id,
          creator: publicPoll.creator as Address,
          title: publicPoll.title,
          description: publicPoll.description,
          options: publicPoll.options,
          deadline: publicPoll.deadline,
          correctOption: publicPoll.correctOption,
          isResolved: publicPoll.isResolved,
          isStakingEnabled: publicPoll.isStakingEnabled,
          totalStaked: publicPoll.totalStaked,
          votes: publicPoll.votes,
          stakes: publicPoll.stakes,
          userVotes: publicPoll.userVotes,
          status: publicPoll.status,
          source: 'public',
          publicId: publicPoll.id,
        };
      }

      // Check blockchain if configured
      if (this.useBlockchain) {
        const blockchainPoll = await this.blockchainService.getPoll(pollId);
        if (blockchainPoll) {
          return {
            id: blockchainPoll.id,
            creator: blockchainPoll.creator,
            title: blockchainPoll.title,
            description: blockchainPoll.description,
            options: blockchainPoll.options,
            deadline: blockchainPoll.deadline,
            correctOption: blockchainPoll.correctOption,
            isResolved: blockchainPoll.isResolved,
            isStakingEnabled: blockchainPoll.isStakingEnabled,
            totalStaked: blockchainPoll.totalStaked,
          votes: this.convertArrayToObject(blockchainPoll.optionVotes),
          stakes: this.convertArrayToStringObject(blockchainPoll.optionStaked),
            userVotes: {},
            status: this.determineStatus(blockchainPoll),
            source: 'blockchain',
          };
        }
      }

      return null;

    } catch (error) {
      console.error('Error getting hybrid poll:', error);
      return null;
    }
  }

  // Helper methods
  private convertArrayToObject(array: number[]): { [option: number]: number } {
    const obj: { [option: number]: number } = {};
    array.forEach((value, index) => {
      obj[index] = value;
    });
    return obj;
  }

  private convertArrayToStringObject(array: string[]): { [option: number]: string } {
    const obj: { [option: number]: string } = {};
    array.forEach((value, index) => {
      obj[index] = value;
    });
    return obj;
  }

  private determineStatus(blockchainPoll: BlockchainPoll): PollStatus {
    const now = Math.floor(Date.now() / 1000);
    if (blockchainPoll.isResolved) return PollStatus.RESOLVED;
    if (blockchainPoll.deadline <= now) return PollStatus.CLOSED;
    return PollStatus.ACTIVE;
  }

  // No sample polls - only live user-generated content
  // All polls must be created by authenticated users
}

// Export singleton instance
export const hybridPollService = new HybridPollService();
