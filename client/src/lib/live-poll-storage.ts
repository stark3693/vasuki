import { Poll, PollStatus } from './web3-config';

// Live poll storage interface
export interface LivePoll {
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

// Local storage key
const POLLS_STORAGE_KEY = 'vasukii_live_polls';
const POLL_COUNTER_KEY = 'vasukii_poll_counter';

// Live poll storage class
export class LivePollStorage {
  private static instance: LivePollStorage;
  private polls: Map<number, LivePoll> = new Map();
  private pollCounter: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): LivePollStorage {
    if (!LivePollStorage.instance) {
      LivePollStorage.instance = new LivePollStorage();
    }
    return LivePollStorage.instance;
  }

  // Load polls from localStorage
  private loadFromStorage(): void {
    try {
      const storedPolls = localStorage.getItem(POLLS_STORAGE_KEY);
      const storedCounter = localStorage.getItem(POLL_COUNTER_KEY);
      
      if (storedPolls) {
        const pollsArray = JSON.parse(storedPolls) as LivePoll[];
        this.polls = new Map(pollsArray.map(poll => [poll.id, poll]));
      }
      
      if (storedCounter) {
        this.pollCounter = parseInt(storedCounter);
      }
    } catch (error) {
      console.error('Error loading polls from storage:', error);
    }
  }

  // Save polls to localStorage
  private saveToStorage(): void {
    try {
      const pollsArray = Array.from(this.polls.values());
      localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(pollsArray));
      localStorage.setItem(POLL_COUNTER_KEY, this.pollCounter.toString());
    } catch (error) {
      console.error('Error saving polls to storage:', error);
    }
  }

  // Create a new poll
  createPoll(pollData: {
    creator: string;
    title: string;
    description: string;
    options: string[];
    deadline: number;
    isStakingEnabled: boolean;
  }): LivePoll {
    const id = ++this.pollCounter;
    const now = Math.floor(Date.now() / 1000);
    
    const poll: LivePoll = {
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

    this.polls.set(id, poll);
    this.saveToStorage();
    
    return poll;
  }

  // Vote on a poll
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
    this.saveToStorage();
    
    return true;
  }

  // Resolve a poll
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
    
    this.saveToStorage();
    return true;
  }

  // Get all polls
  getAllPolls(): LivePoll[] {
    return Array.from(this.polls.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get active polls
  getActivePolls(): LivePoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPolls().filter(poll => 
      !poll.isResolved && poll.deadline > now
    );
  }

  // Get closed polls
  getClosedPolls(): LivePoll[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllPolls().filter(poll => 
      poll.deadline <= now && !poll.isResolved
    );
  }

  // Get resolved polls
  getResolvedPolls(): LivePoll[] {
    return this.getAllPolls().filter(poll => poll.isResolved);
  }

  // Get poll by ID
  getPoll(pollId: number): LivePoll | null {
    return this.polls.get(pollId) || null;
  }

  // Get user's polls
  getUserPolls(userAddress: string): LivePoll[] {
    return this.getAllPolls().filter(poll => poll.creator === userAddress);
  }

  // Get user's votes
  getUserVotes(userAddress: string): LivePoll[] {
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

  // No sample polls - only live, user-generated content
  // This ensures all displayed polls are genuine user creations

  // Clear all data (for testing)
  clearAllData(): void {
    this.polls.clear();
    this.pollCounter = 0;
    localStorage.removeItem(POLLS_STORAGE_KEY);
    localStorage.removeItem(POLL_COUNTER_KEY);
  }
}

// Export singleton instance
export const livePollStorage = LivePollStorage.getInstance();
