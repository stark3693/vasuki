import { Poll, PollStatus } from './web3-config';

// Public poll storage interface - truly public across all users
export interface PublicPoll {
  id: number;
  creator: string;
  title: string;
  description: string;
  options: string[];
  deadline: number;
  correctOption: number;
  isResolved: boolean;
  isStakingEnabled: boolean;
  totalStaked: string;
  status: PollStatus;
  votes: { [option: number]: number };
  stakes: { [option: number]: string };
  userVotes: { [userAddress: string]: { option: number; stakeAmount: string; timestamp: number } };
  createdAt: number;
  updatedAt: number;
}

// Global public storage key - this simulates a public blockchain
const PUBLIC_POLLS_KEY = 'vasukii_public_polls_global_network';
const PUBLIC_POLL_COUNTER_KEY = 'vasukii_public_poll_counter_global_network';

// Public poll storage class - simulates public blockchain behavior
export class PublicPollStorage {
  private static instance: PublicPollStorage;
  private polls: Map<number, PublicPoll> = new Map();
  private pollCounter: number = 0;
  private listeners: Set<(polls: PublicPoll[]) => void> = new Set();

  constructor() {
    this.initializePublicStorage();
    this.loadFromPublicStorage();
    this.setupPublicSync();
  }

  static getInstance(): PublicPollStorage {
    if (!PublicPollStorage.instance) {
      PublicPollStorage.instance = new PublicPollStorage();
    }
    return PublicPollStorage.instance;
  }

  // Initialize public storage - simulates blockchain initialization
  private initializePublicStorage(): void {
    // This simulates a public network where all users share the same data
    // In a real blockchain, this would be the actual blockchain state
    console.log('🌐 Initializing Public Poll Network...');
  }

  // Load polls from public storage - simulates reading from blockchain
  private loadFromPublicStorage(): void {
    try {
      const storedPolls = localStorage.getItem(PUBLIC_POLLS_KEY);
      const storedCounter = localStorage.getItem(PUBLIC_POLL_COUNTER_KEY);
      
      if (storedPolls) {
        const pollsArray = JSON.parse(storedPolls) as PublicPoll[];
        this.polls = new Map(pollsArray.map(poll => [poll.id, poll]));
        console.log(`📊 Loaded ${pollsArray.length} public polls from network`);
      }
      
      if (storedCounter) {
        this.pollCounter = parseInt(storedCounter);
      }
    } catch (error) {
      console.error('Error loading public polls from network:', error);
    }
  }

  // Save polls to public storage - simulates blockchain state update
  private saveToPublicStorage(): void {
    try {
      const pollsArray = Array.from(this.polls.values());
      localStorage.setItem(PUBLIC_POLLS_KEY, JSON.stringify(pollsArray));
      localStorage.setItem(PUBLIC_POLL_COUNTER_KEY, this.pollCounter.toString());
      
      // Notify all listeners (simulates blockchain event emission)
      this.notifyListeners();
      
      console.log(`💾 Public network updated: ${pollsArray.length} polls`);
    } catch (error) {
      console.error('Error saving public polls to network:', error);
    }
  }

  // Setup public synchronization - simulates blockchain network sync
  private setupPublicSync(): void {
    if (typeof window === 'undefined') return;
    
    // Listen for network updates (simulates blockchain event listening)
    window.addEventListener('storage', (e) => {
      if (e.key === PUBLIC_POLLS_KEY) {
        this.loadFromPublicStorage();
        this.notifyListeners();
      }
    });

    // Periodic network sync (simulates blockchain sync)
    setInterval(() => {
      this.syncWithPublicNetwork();
    }, 3000); // Sync every 3 seconds for public network
    
    // Listen for custom public network events
    window.addEventListener('publicPollsUpdated', () => {
      this.loadFromPublicStorage();
      this.notifyListeners();
    });
  }

  // Sync with public network - simulates blockchain synchronization
  private syncWithPublicNetwork(): void {
    const storedPolls = localStorage.getItem(PUBLIC_POLLS_KEY);
    if (storedPolls) {
      const networkPolls = JSON.parse(storedPolls) as PublicPoll[];
      let hasUpdates = false;
      
      // Check for new polls from the public network
      networkPolls.forEach(poll => {
        if (!this.polls.has(poll.id) || this.polls.get(poll.id)?.updatedAt !== poll.updatedAt) {
          this.polls.set(poll.id, poll);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        this.notifyListeners();
      }
    }
  }

  // Notify all listeners of updates (simulates blockchain event emission)
  private notifyListeners(): void {
    const polls = Array.from(this.polls.values());
    this.listeners.forEach(listener => {
      try {
        listener(polls);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Subscribe to public poll updates (simulates blockchain event subscription)
  subscribe(listener: (polls: PublicPoll[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Create a new public poll - simulates blockchain transaction
  createPublicPoll(pollData: {
    creator: string;
    title: string;
    description: string;
    options: string[];
    deadline: number;
    isStakingEnabled: boolean;
  }): PublicPoll {
    const id = ++this.pollCounter;
    const now = Math.floor(Date.now() / 1000);
    
    const poll: PublicPoll = {
      id,
      creator: pollData.creator,
      title: pollData.title,
      description: pollData.description,
      options: pollData.options,
      deadline: pollData.deadline,
      correctOption: 0,
      isResolved: false,
      isStakingEnabled: pollData.isStakingEnabled,
      totalStaked: '0',
      status: PollStatus.ACTIVE,
      votes: {},
      stakes: {},
      userVotes: {},
      createdAt: now,
      updatedAt: now,
    };

    // Initialize vote counts for each option
    pollData.options.forEach((_, index) => {
      poll.votes[index] = 0;
      poll.stakes[index] = '0';
    });

    // Add to public network
    this.polls.set(id, poll);
    this.saveToPublicStorage();
    
    console.log(`🌍 PUBLIC POLL CREATED: "${poll.title}" by ${poll.creator} - NOW VISIBLE TO ALL USERS WORLDWIDE`);
    
    return poll;
  }

  // Vote on a public poll - simulates blockchain transaction
  voteOnPublicPoll(pollId: number, userAddress: string, option: number, stakeAmount: string = '0'): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new Error('Poll not found in public network');
    }

    if (poll.isResolved) {
      throw new Error('Poll is already resolved');
    }

    if (poll.deadline < Math.floor(Date.now() / 1000)) {
      throw new Error('Poll deadline has passed');
    }

    if (poll.userVotes[userAddress]) {
      throw new Error('User has already voted on this public poll');
    }

    if (option >= poll.options.length) {
      throw new Error('Invalid option');
    }

    // Record the vote
    poll.userVotes[userAddress] = {
      option,
      stakeAmount,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Update vote counts
    poll.votes[option] = (poll.votes[option] || 0) + 1;
    
    // Update stakes if staking is enabled
    if (poll.isStakingEnabled && stakeAmount !== '0') {
      const currentStake = poll.stakes[option] || '0';
      poll.stakes[option] = (parseFloat(currentStake) + parseFloat(stakeAmount)).toString();
      poll.totalStaked = (parseFloat(poll.totalStaked) + parseFloat(stakeAmount)).toString();
    }

    poll.updatedAt = Math.floor(Date.now() / 1000);
    this.saveToPublicStorage();
    
    console.log(`🗳️ PUBLIC VOTE CAST: ${userAddress} voted for option ${option} on poll "${poll.title}" - VISIBLE TO ALL USERS`);
    
    return true;
  }

  // Resolve a public poll - simulates blockchain transaction
  resolvePublicPoll(pollId: number, correctOption: number): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new Error('Poll not found in public network');
    }

    if (poll.isResolved) {
      throw new Error('Poll is already resolved');
    }

    poll.correctOption = correctOption;
    poll.isResolved = true;
    poll.status = PollStatus.RESOLVED;
    poll.updatedAt = Math.floor(Date.now() / 1000);
    
    this.saveToPublicStorage();
    
    console.log(`✅ PUBLIC POLL RESOLVED: "${poll.title}" - Correct option: ${correctOption} - RESULT VISIBLE TO ALL USERS`);
    
    return true;
  }

  // Get all public polls - simulates blockchain query
  getAllPublicPolls(): PublicPoll[] {
    return Array.from(this.polls.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get active public polls
  getActivePublicPolls(): PublicPoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPublicPolls().filter(poll => 
      !poll.isResolved && poll.deadline > now
    );
  }

  // Get closed public polls
  getClosedPublicPolls(): PublicPoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPublicPolls().filter(poll => 
      poll.deadline <= now && !poll.isResolved
    );
  }

  // Get resolved public polls
  getResolvedPublicPolls(): PublicPoll[] {
    return this.getAllPublicPolls().filter(poll => poll.isResolved);
  }

  // Get public poll by ID
  getPublicPoll(pollId: number): PublicPoll | null {
    return this.polls.get(pollId) || null;
  }

  // Get user's public polls
  getUserPublicPolls(userAddress: string): PublicPoll[] {
    return this.getAllPublicPolls().filter(poll => poll.creator === userAddress);
  }

  // Get user's votes on public polls
  getUserPublicVotes(userAddress: string): PublicPoll[] {
    return this.getAllPublicPolls().filter(poll => poll.userVotes[userAddress]);
  }

  // Check if user has voted on a public poll
  hasUserVotedOnPublicPoll(pollId: number, userAddress: string): boolean {
    const poll = this.polls.get(pollId);
    return poll ? !!poll.userVotes[userAddress] : false;
  }

  // Get user's vote for a specific public poll
  getUserPublicVote(pollId: number, userAddress: string): { option: number; stakeAmount: string; timestamp: number } | null {
    const poll = this.polls.get(pollId);
    return poll ? poll.userVotes[userAddress] || null : null;
  }

  // Get public poll counter
  getPublicPollCounter(): number {
    return this.pollCounter;
  }

  // Get public network statistics
  getPublicNetworkStats(): {
    totalPolls: number;
    activePolls: number;
    closedPolls: number;
    resolvedPolls: number;
    totalVotes: number;
    totalStaked: string;
  } {
    const allPolls = this.getAllPublicPolls();
    const activePolls = this.getActivePublicPolls();
    const closedPolls = this.getClosedPublicPolls();
    const resolvedPolls = this.getResolvedPublicPolls();
    
    const totalVotes = allPolls.reduce((sum, poll) => 
      sum + Object.values(poll.votes).reduce((v, votes) => v + votes, 0), 0
    );
    
    const totalStaked = allPolls.reduce((sum, poll) => 
      sum + parseFloat(poll.totalStaked), 0
    ).toString();

    return {
      totalPolls: allPolls.length,
      activePolls: activePolls.length,
      closedPolls: closedPolls.length,
      resolvedPolls: resolvedPolls.length,
      totalVotes,
      totalStaked,
    };
  }

  // Clear all public data (for testing)
  clearAllPublicData(): void {
    this.polls.clear();
    this.pollCounter = 0;
    localStorage.removeItem(PUBLIC_POLLS_KEY);
    localStorage.removeItem(PUBLIC_POLL_COUNTER_KEY);
    console.log('🗑️ All public polls cleared from network');
  }

  // Simulate network broadcast (for testing cross-user visibility)
  broadcastToNetwork(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('publicPollsUpdated'));
    }
  }
}

// Export singleton instance - this represents the public blockchain network
export const publicPollStorage = PublicPollStorage.getInstance();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).publicPollStorage = publicPollStorage;
  console.log('🌐 Public Poll Network initialized - accessible via window.publicPollStorage');
}
