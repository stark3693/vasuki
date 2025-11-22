import { Poll, PollStatus } from './web3-config';

// Shared poll storage interface
export interface SharedPoll {
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

// Global shared storage keys - these will be the same for all users
const SHARED_POLLS_KEY = 'vasukii_shared_polls_global';
const SHARED_POLL_COUNTER_KEY = 'vasukii_shared_poll_counter_global';

// Global shared storage simulation using window object
declare global {
  interface Window {
    __VASUKII_SHARED_POLLS__?: Map<number, SharedPoll>;
    __VASUKII_POLL_COUNTER__?: number;
  }
}

// Shared poll storage class
export class SharedPollStorage {
  private static instance: SharedPollStorage;
  private polls: Map<number, SharedPoll> = new Map();
  private pollCounter: number = 0;

  constructor() {
    this.initializeGlobalStorage();
    this.loadFromStorage();
    this.setupCrossTabSync();
  }

  static getInstance(): SharedPollStorage {
    if (!SharedPollStorage.instance) {
      SharedPollStorage.instance = new SharedPollStorage();
    }
    return SharedPollStorage.instance;
  }

  // Initialize global storage on window object
  private initializeGlobalStorage(): void {
    if (typeof window !== 'undefined') {
      if (!window.__VASUKII_SHARED_POLLS__) {
        window.__VASUKII_SHARED_POLLS__ = new Map();
      }
      if (!window.__VASUKII_POLL_COUNTER__) {
        window.__VASUKII_POLL_COUNTER__ = 0;
      }
      // Use global storage
      this.polls = window.__VASUKII_SHARED_POLLS__;
      this.pollCounter = window.__VASUKII_POLL_COUNTER__;
    }
  }

  // Load polls from localStorage and sync with global storage
  private loadFromStorage(): void {
    try {
      const storedPolls = localStorage.getItem(SHARED_POLLS_KEY);
      const storedCounter = localStorage.getItem(SHARED_POLL_COUNTER_KEY);
      
      if (storedPolls) {
        const pollsArray = JSON.parse(storedPolls) as SharedPoll[];
        const loadedPolls = new Map(pollsArray.map(poll => [poll.id, poll]));
        
        // Merge with global storage (global takes precedence for real-time updates)
        loadedPolls.forEach((poll, id) => {
          if (!this.polls.has(id)) {
            this.polls.set(id, poll);
          }
        });
        
        // Update global storage
        if (typeof window !== 'undefined') {
          window.__VASUKII_SHARED_POLLS__ = this.polls;
        }
      }
      
      if (storedCounter) {
        const counter = parseInt(storedCounter);
        if (counter > this.pollCounter) {
          this.pollCounter = counter;
          if (typeof window !== 'undefined') {
            window.__VASUKII_POLL_COUNTER__ = this.pollCounter;
          }
        }
      }
    } catch (error) {
      console.error('Error loading shared polls from storage:', error);
    }
  }

  // Save polls to localStorage and update global storage
  private saveToStorage(): void {
    try {
      const pollsArray = Array.from(this.polls.values());
      localStorage.setItem(SHARED_POLLS_KEY, JSON.stringify(pollsArray));
      localStorage.setItem(SHARED_POLL_COUNTER_KEY, this.pollCounter.toString());
      
      // Update global storage
      if (typeof window !== 'undefined') {
        window.__VASUKII_SHARED_POLLS__ = this.polls;
        window.__VASUKII_POLL_COUNTER__ = this.pollCounter;
      }
      
      // Broadcast change to other tabs/windows
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sharedPollsUpdated', {
          detail: { polls: pollsArray, counter: this.pollCounter }
        }));
      }
    } catch (error) {
      console.error('Error saving shared polls to storage:', error);
    }
  }

  // Listen for changes from other tabs and sync with global storage
  private setupCrossTabSync(): void {
    if (typeof window === 'undefined') return;
    
    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === SHARED_POLLS_KEY) {
        this.loadFromStorage();
      }
    });

    // Listen for custom events from same tab
    window.addEventListener('sharedPollsUpdated', (event: any) => {
      const { polls, counter } = event.detail || {};
      if (polls && counter !== undefined) {
        // Update global storage with new data
        this.polls.clear();
        polls.forEach((poll: SharedPoll) => {
          this.polls.set(poll.id, poll);
        });
        this.pollCounter = counter;
        
        // Update global window storage
        window.__VASUKII_SHARED_POLLS__ = this.polls;
        window.__VASUKII_POLL_COUNTER__ = this.pollCounter;
      }
    });
    
    // Periodic sync to ensure consistency
    setInterval(() => {
      this.syncWithGlobalStorage();
    }, 5000); // Sync every 5 seconds
  }

  // Sync with global storage to ensure consistency
  private syncWithGlobalStorage(): void {
    if (typeof window !== 'undefined' && window.__VASUKII_SHARED_POLLS__) {
      const globalPolls = window.__VASUKII_SHARED_POLLS__;
      const globalCounter = window.__VASUKII_POLL_COUNTER__ || 0;
      
      // Update local storage with global data
      let hasChanges = false;
      
      globalPolls.forEach((poll, id) => {
        if (!this.polls.has(id) || this.polls.get(id)?.updatedAt !== poll.updatedAt) {
          this.polls.set(id, poll);
          hasChanges = true;
        }
      });
      
      if (globalCounter > this.pollCounter) {
        this.pollCounter = globalCounter;
        hasChanges = true;
      }
      
      if (hasChanges) {
        this.saveToStorage();
      }
    }
  }

  // Create a new poll (visible to ALL users)
  createPoll(pollData: {
    creator: string;
    title: string;
    description: string;
    options: string[];
    deadline: number;
    isStakingEnabled: boolean;
  }): SharedPoll {
    const id = ++this.pollCounter;
    const now = Math.floor(Date.now() / 1000);
    
    const poll: SharedPoll = {
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

    // Add to both local and global storage
    this.polls.set(id, poll);
    
    // Update global storage immediately
    if (typeof window !== 'undefined') {
      window.__VASUKII_SHARED_POLLS__ = this.polls;
      window.__VASUKII_POLL_COUNTER__ = this.pollCounter;
    }
    
    this.saveToStorage();
    
    console.log(`🌍 Global Poll Created: "${poll.title}" by ${poll.creator} - Visible to ALL users`);
    
    return poll;
  }

  // Vote on a poll (visible to ALL users)
  vote(pollId: number, userAddress: string, option: number, stakeAmount: string = '0'): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.isResolved) {
      throw new Error('Poll is already resolved');
    }

    if (poll.deadline < Math.floor(Date.now() / 1000)) {
      throw new Error('Poll deadline has passed');
    }

    if (poll.userVotes[userAddress]) {
      throw new Error('User has already voted');
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
    
    // Update global storage immediately
    if (typeof window !== 'undefined') {
      window.__VASUKII_SHARED_POLLS__ = this.polls;
    }
    
    this.saveToStorage();
    
    console.log(`🗳️ Global Vote Cast: ${userAddress} voted for option ${option} on poll "${poll.title}"`);
    
    return true;
  }

  // Resolve a poll (visible to ALL users)
  resolvePoll(pollId: number, correctOption: number): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.isResolved) {
      throw new Error('Poll is already resolved');
    }

    poll.correctOption = correctOption;
    poll.isResolved = true;
    poll.status = PollStatus.RESOLVED;
    poll.updatedAt = Math.floor(Date.now() / 1000);
    
    // Update global storage immediately
    if (typeof window !== 'undefined') {
      window.__VASUKII_SHARED_POLLS__ = this.polls;
    }
    
    this.saveToStorage();
    
    console.log(`✅ Global Poll Resolved: "${poll.title}" - Correct option: ${correctOption}`);
    
    return true;
  }

  // Get all polls (visible to ALL users)
  getAllPolls(): SharedPoll[] {
    return Array.from(this.polls.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get active polls
  getActivePolls(): SharedPoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPolls().filter(poll => 
      !poll.isResolved && poll.deadline > now
    );
  }

  // Get closed polls
  getClosedPolls(): SharedPoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPolls().filter(poll => 
      poll.deadline <= now && !poll.isResolved
    );
  }

  // Get resolved polls
  getResolvedPolls(): SharedPoll[] {
    return this.getAllPolls().filter(poll => poll.isResolved);
  }

  // Get poll by ID
  getPoll(pollId: number): SharedPoll | null {
    return this.polls.get(pollId) || null;
  }

  // Get user's polls
  getUserPolls(userAddress: string): SharedPoll[] {
    return this.getAllPolls().filter(poll => poll.creator === userAddress);
  }

  // Get user's votes
  getUserVotes(userAddress: string): SharedPoll[] {
    return this.getAllPolls().filter(poll => poll.userVotes[userAddress]);
  }

  // Check if user has voted on a poll
  hasUserVoted(pollId: number, userAddress: string): boolean {
    const poll = this.polls.get(pollId);
    return poll ? !!poll.userVotes[userAddress] : false;
  }

  // Get user's vote for a specific poll
  getUserVote(pollId: number, userAddress: string): { option: number; stakeAmount: string; timestamp: number } | null {
    const poll = this.polls.get(pollId);
    return poll ? poll.userVotes[userAddress] || null : null;
  }

  // Get poll counter
  getPollCounter(): number {
    return this.pollCounter;
  }

  // No sample polls - only real user-generated content
  // All polls must be created by actual users

  // Clear all data (for testing)
  clearAllData(): void {
    this.polls.clear();
    this.pollCounter = 0;
    localStorage.removeItem(SHARED_POLLS_KEY);
    localStorage.removeItem(SHARED_POLL_COUNTER_KEY);
    console.log('🗑️ All shared polls cleared');
  }

  // Clear any dummy/sample polls (remove polls with dummy addresses)
  clearDummyPolls(): void {
    const dummyAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210',
      '0x1111222233334444555566667777888899990000'
    ];
    
    let removedCount = 0;
    const pollsToDelete: number[] = [];
    
    // Collect polls to delete
    this.polls.forEach((poll, pollId) => {
      if (dummyAddresses.includes(poll.creator)) {
        pollsToDelete.push(pollId);
      }
    });
    
    // Delete collected polls
    pollsToDelete.forEach(pollId => {
      this.polls.delete(pollId);
      removedCount++;
    });
    
    if (removedCount > 0) {
      this.saveToStorage();
      console.log(`🗑️ Removed ${removedCount} dummy polls - only real user polls remain`);
    }
  }
}

// Export singleton instance
export const sharedPollStorage = SharedPollStorage.getInstance();

// Clear any existing dummy polls on initialization
sharedPollStorage.clearDummyPolls();

// Import debug utility for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('./debug-global-storage');
}
