import { blockchainPollService } from './blockchain-poll-service';
import { usePolls } from '../hooks/use-polls';

export interface LivePollUpdate {
  type: 'vote' | 'poll_created' | 'poll_resolved' | 'reward_claimed';
  pollId: number | string;
  data: any;
  timestamp: number;
}

export class LivePollService {
  private static instance: LivePollService;
  private updateCallbacks: ((update: LivePollUpdate) => void)[] = [];
  private isListening = false;

  static getInstance(): LivePollService {
    if (!LivePollService.instance) {
      LivePollService.instance = new LivePollService();
    }
    return LivePollService.instance;
  }

  // Start listening for real-time updates
  startListening() {
    if (this.isListening) return;
    
    this.isListening = true;
    console.log('🔴 Starting live poll service...');

    // Listen for blockchain events
    this.setupBlockchainEventListeners();
    
    // Listen for custom poll events
    this.setupCustomEventListeners();

    // Start blockchain event listening
    blockchainPollService.listenToEvents();

    console.log('✅ Live poll service started');
  }

  // Stop listening for updates
  stopListening() {
    if (!this.isListening) return;
    
    this.isListening = false;
    this.removeEventListeners();
    console.log('🔴 Live poll service stopped');
  }

  // Add callback for poll updates
  onUpdate(callback: (update: LivePollUpdate) => void) {
    this.updateCallbacks.push(callback);
  }

  // Remove callback for poll updates
  offUpdate(callback: (update: LivePollUpdate) => void) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  // Notify all callbacks of updates
  private notifyUpdate(update: LivePollUpdate) {
    this.updateCallbacks.forEach(callback => callback(update));
  }

  // Setup blockchain event listeners
  private setupBlockchainEventListeners() {
    if (typeof window === 'undefined') return;

    // Listen for VoteCast events
    window.addEventListener('VoteCast', (event: any) => {
      const { pollId, voter, option, stakeAmount, transactionHash, timestamp } = event.detail;
      
      this.notifyUpdate({
        type: 'vote',
        pollId,
        data: {
          voter,
          option,
          stakeAmount,
          transactionHash,
          isRealTime: true
        },
        timestamp: timestamp || Date.now()
      });

      // Force refresh of poll data
      this.refreshPollData();
    });

    // Listen for PollCreated events
    window.addEventListener('PollCreated', (event: any) => {
      const { pollId, creator, title, deadline, isStakingEnabled, timestamp } = event.detail;
      
      this.notifyUpdate({
        type: 'poll_created',
        pollId,
        data: {
          creator,
          title,
          deadline,
          isStakingEnabled,
          isRealTime: true
        },
        timestamp: timestamp || Date.now()
      });

      this.refreshPollData();
    });

    // Listen for PollResolved events
    window.addEventListener('PollResolved', (event: any) => {
      const { pollId, correctOption, totalRewards, timestamp } = event.detail;
      
      this.notifyUpdate({
        type: 'poll_resolved',
        pollId,
        data: {
          correctOption,
          totalRewards,
          isRealTime: true
        },
        timestamp: timestamp || Date.now()
      });

      this.refreshPollData();
    });

    // Listen for RewardClaimed events
    window.addEventListener('RewardClaimed', (event: any) => {
      const { pollId, user, rewardAmount, timestamp } = event.detail;
      
      this.notifyUpdate({
        type: 'reward_claimed',
        pollId,
        data: {
          user,
          rewardAmount,
          isRealTime: true
        },
        timestamp: timestamp || Date.now()
      });

      this.refreshPollData();
    });
  }

  // Setup custom event listeners
  private setupCustomEventListeners() {
    if (typeof window === 'undefined') return;

    // Listen for poll vote cast events from UI
    window.addEventListener('pollVoteCast', (event: any) => {
      const { pollId, option, stakeAmount, transactionHash, timestamp } = event.detail;
      
      this.notifyUpdate({
        type: 'vote',
        pollId,
        data: {
          option,
          stakeAmount,
          transactionHash,
          isRealTime: true,
          source: 'ui'
        },
        timestamp: timestamp || Date.now()
      });
    });
  }

  // Remove all event listeners
  private removeEventListeners() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('VoteCast', () => {});
    window.removeEventListener('PollCreated', () => {});
    window.removeEventListener('PollResolved', () => {});
    window.removeEventListener('RewardClaimed', () => {});
    window.removeEventListener('pollVoteCast', () => {});
  }

  // Refresh poll data
  private refreshPollData() {
    // Trigger a global event to refresh poll queries
    window.dispatchEvent(new CustomEvent('refreshPolls'));
  }

  // Simulate a vote for testing
  simulateVote(pollId: number, option: number, stakeAmount: string = '0') {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('VoteCast', {
        detail: {
          pollId,
          voter: '0x1234567890123456789012345678901234567890',
          option,
          stakeAmount,
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          timestamp: Date.now()
        }
      }));
    }, 1000);
  }

  // Simulate a poll creation for testing
  simulatePollCreation(pollId: number, title: string) {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('PollCreated', {
        detail: {
          pollId,
          creator: '0x1234567890123456789012345678901234567890',
          title,
          deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
          isStakingEnabled: true,
          timestamp: Date.now()
        }
      }));
    }, 1000);
  }
}

// Export singleton instance
export const livePollService = LivePollService.getInstance();
