import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai, mainnet, sepolia } from 'wagmi/chains';
import { ENV_CONFIG, DEFAULT_CONTRACT_ADDRESSES, isWalletConnectConfigured } from '../config/env';

// Supported tokens configuration
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

// Contract addresses (update these after deployment)
export const CONTRACT_ADDRESSES = {
  VSK_TOKEN: ENV_CONFIG.VSK_TOKEN_ADDRESS || DEFAULT_CONTRACT_ADDRESSES.VSK_TOKEN,
  PREDICTION_POLL: ENV_CONFIG.PREDICTION_POLL_ADDRESS || DEFAULT_CONTRACT_ADDRESSES.PREDICTION_POLL,
} as const;

// Supported tokens for staking
export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    address: CONTRACT_ADDRESSES.VSK_TOKEN,
    symbol: 'VSK',
    name: 'Vasukii Token',
    decimals: 18,
    logoUrl: '/assets/logo.png'
  },
  // Add more tokens here as needed
  // Example: USDC token
  // {
  //   address: '0xA0b86a33E6441c8C4C8C4C8C4C8C4C8C4C8C4C8C', // USDC contract address
  //   symbol: 'USDC',
  //   name: 'USD Coin',
  //   decimals: 6,
  //   logoUrl: '/assets/usdc.png'
  // },
  // Example: WETH token
  // {
  //   address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH contract address
  //   symbol: 'WETH',
  //   name: 'Wrapped Ether',
  //   decimals: 18,
  //   logoUrl: '/assets/weth.png'
  // },
];

// Supported chains
export const SUPPORTED_CHAINS = [polygon, polygonMumbai, mainnet, sepolia] as const;

// RainbowKit configuration - only create if WalletConnect is configured
export const config = isWalletConnectConfigured() ? getDefaultConfig({
  appName: 'Vasukii Prediction Polls',
  projectId: ENV_CONFIG.WALLET_CONNECT_PROJECT_ID,
  chains: SUPPORTED_CHAINS,
  ssr: false,
}) : null;

// Generic ERC20 ABI for any token
export const ERC20_ABI = [
  // ERC20 standard functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// VSK Token ABI (with custom staking functions)
export const VSK_TOKEN_ABI = [
  ...ERC20_ABI,
  // Custom functions
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function getStakedBalance(address user) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function claimTokens(uint256 amount)',
  
  // Custom events
  'event TokensStaked(address indexed user, uint256 amount, uint256 timestamp)',
  'event TokensUnstaked(address indexed user, uint256 amount, uint256 timestamp)',
  'event TokensMinted(address indexed to, uint256 amount)',
] as const;

export const PREDICTION_POLL_ABI = [
  // Poll management
  'function createPoll(string memory title, string memory description, string[] memory options, uint256 deadline, bool isStakingEnabled, uint256 creatorFeePercent)',
  'function vote(uint256 pollId, uint256 option, uint256 stakeAmount)',
  'function resolvePoll(uint256 pollId, uint256 correctOption)',
  'function claimReward(uint256 pollId)',
  'function claimStacks(uint256 pollId)',
  
  // View functions
  'function getPoll(uint256 pollId) view returns (uint256 id, address creator, string memory title, string memory description, string[] memory options, uint256 deadline, uint256 correctOption, bool isResolved, bool isStakingEnabled, uint256 totalStaked, uint256 creatorFeePercent, bool creatorHasClaimed)',
  'function getPollVotes(uint256 pollId) view returns (uint256[] memory)',
  'function getPollStakes(uint256 pollId) view returns (uint256[] memory)',
  'function hasUserVoted(uint256 pollId, address user) view returns (bool)',
  'function getUserVote(uint256 pollId, address user) view returns (uint256, uint256)',
  'function getUserPolls(address user) view returns (uint256[] memory)',
  'function getUserVotes(address user) view returns (uint256[] memory)',
  'function getCreatorFeeInfo(uint256 pollId) view returns (uint256 creatorFeePercent, bool creatorHasClaimed, uint256 totalStaked, uint256 creatorFeeAmount)',
  'function pollCounter() view returns (uint256)',
  
  // Events
  'event PollCreated(uint256 indexed pollId, address indexed creator, string title, uint256 deadline, bool isStakingEnabled)',
  'event VoteCast(uint256 indexed pollId, address indexed voter, uint256 option, uint256 stakeAmount)',
  'event PollResolved(uint256 indexed pollId, uint256 correctOption, uint256 totalRewards)',
  'event RewardClaimed(uint256 indexed pollId, address indexed user, uint256 rewardAmount)',
  'event CreatorStacksClaimed(uint256 indexed pollId, address indexed creator, uint256 claimedAmount, uint256 creatorFeePercent)',
] as const;

// Poll status enum
export enum PollStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  RESOLVED = 'resolved',
}

// Poll type definition
// Import User type from shared schema
import type { User } from '@shared/schema';

export interface Poll {
  id: number;
  originalId?: string; // For server polls, preserve the original UUID string ID
  creator: string; // Keep this for blockchain polls
  title: string;
  description: string;
  options: string[];
  deadline: number;
  correctOption: number;
  isResolved: boolean;
  isStakingEnabled: boolean;
  totalStaked: string;
  creatorFeePercent?: number; // Creator fee percentage (e.g., 500 = 5%)
  creatorHasClaimed?: boolean; // Whether creator has claimed their fee
  votes?: number[] | { [option: number]: number };
  stakes?: number[] | { [option: number]: string };
  userVotes?: { [userAddress: string]: { option: number; timestamp: number } };
  status: PollStatus;
}

// Server API poll type (with creator as User object)
export interface ServerPoll extends Omit<Poll, 'creator' | 'id' | 'deadline'> {
  id: string; // Server uses UUID strings
  creator: User; // Server returns creator as User object
  deadline: string; // Server returns ISO string
  createdAt: Date; // Ensure createdAt is included
  updatedAt: Date; // Ensure updatedAt is included
  totalVotes: number;
  userVote?: {
    option: number;
    stakeAmount: string;
    timestamp: number;
  };
}

// Vote type definition
export interface Vote {
  pollId: number;
  option: number;
  stakeAmount: string;
  timestamp: number;
}

// User profile type
export interface UserProfile {
  address: string;
  pollsCreated: number[];
  votesCast: number[];
  totalStaked: string;
  totalRewards: string;
}
