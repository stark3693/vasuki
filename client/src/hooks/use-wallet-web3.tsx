import { useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther, Address } from 'viem';
import { CONTRACT_ADDRESSES, VSK_TOKEN_ABI, ERC20_ABI, PREDICTION_POLL_ABI, SUPPORTED_TOKENS, TokenConfig } from '../lib/web3-config';
import { Poll, Vote, UserProfile } from '../lib/web3-config';
import { isWalletConnectConfigured } from '../config/env';
import { useWallet } from './use-wallet';

export function useWalletWeb3() {
  const queryClient = useQueryClient();
  const isWeb3Ready = isWalletConnectConfigured();
  const { walletAddress, isConnected } = useWallet();

  // Return default values when Web3 is not configured
  if (!isWeb3Ready) {
    // Get balances from our token system
    const vskBalance = 0;
    const stakedBalance = 0;

    return {
      // Connection state
      address: walletAddress,
      isConnected: isConnected,
      chain: null,
      connect: () => {},
      disconnect: () => {},
      connectors: [],
      
      // Balances
      ethBalance: '0',
      vskBalance: vskBalance.toString(),
      stakedBalance: stakedBalance.toString(),
      
      // User data
      userProfile: walletAddress ? {
        address: walletAddress,
        pollsCreated: [],
        votesCast: [],
        totalStaked: stakedBalance.toString(),
        totalRewards: '0',
      } : undefined,
      userPolls: [],
      userVotes: [],
      pollCounter: 0,
      
      // Token operations
      stakeVSK: async () => {
        throw new Error('Staking is disabled');
      },
      unstakeVSK: async () => {
        throw new Error('Staking is disabled');
      },
      approveVSK: async () => {
        throw new Error('Staking is disabled');
      },
      claimVSK: async () => {
        throw new Error('Token claiming is disabled');
        return 'mock-transaction-hash'; // Return a mock transaction hash
      },
      getTokenBalance: async (tokenAddress: string, userAddress: string): Promise<string> => {
        // For non-Web3 mode, return VSK balance if it's the VSK token, otherwise return 0
        if (tokenAddress === CONTRACT_ADDRESSES.VSK_TOKEN && userAddress === walletAddress) {
          return vskBalance.toString();
        }
        return '0';
      },
      approveToken: async (tokenAddress: string, spender: string, amount: string) => {
        if (!walletAddress) throw new Error('Wallet not connected');
        // For non-Web3 mode, use local approval system
        throw new Error('Token approval is disabled');
      },
      transferToken: async (tokenAddress: string, to: string, amount: string) => {
        if (!walletAddress) throw new Error('Wallet not connected');
        // For non-Web3 mode, this would need to be implemented with local token system
        throw new Error('Token transfer not available in non-Web3 mode');
      },
      isStaking: false,
      isUnstaking: false,
      isApproving: false,
      isClaiming: false,
      
      // Utilities
      refreshBalances: () => {
        if (walletAddress) {
          queryClient.invalidateQueries({ queryKey: ['vsk-balance', walletAddress] });
        }
      },
      voteOnPollContract: async () => {
        throw new Error('Poll voting not available in non-Web3 mode');
      },
    };
  }

  // When Web3 is configured, try to use wagmi hooks
  try {
    const { useAccount, useConnect, useDisconnect, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } = require('wagmi');
    
    const { address, isConnected, chain } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    // Get ETH balance
    const { data: ethBalance } = useBalance({
      address,
    });

    // Get VSK token balance
    const { data: vskBalance } = useReadContract({
      address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
      abi: VSK_TOKEN_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!CONTRACT_ADDRESSES.VSK_TOKEN,
      },
    });

    // Get staked VSK balance
    const { data: stakedBalance } = useReadContract({
      address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
      abi: VSK_TOKEN_ABI,
      functionName: 'getStakedBalance',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!CONTRACT_ADDRESSES.VSK_TOKEN,
      },
    });

    // Get user polls
    const { data: userPolls } = useReadContract({
      address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
      abi: PREDICTION_POLL_ABI,
      functionName: 'getUserPolls',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!CONTRACT_ADDRESSES.PREDICTION_POLL,
      },
    });

    // Get user votes
    const { data: userVotes } = useReadContract({
      address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
      abi: PREDICTION_POLL_ABI,
      functionName: 'getUserVotes',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!CONTRACT_ADDRESSES.PREDICTION_POLL,
      },
    });

    // Get poll counter
    const { data: pollCounter } = useReadContract({
      address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
      abi: PREDICTION_POLL_ABI,
      functionName: 'pollCounter',
      query: {
        enabled: !!CONTRACT_ADDRESSES.PREDICTION_POLL,
      },
    });

    // Stake tokens mutation
    const { writeContract: stakeTokens, data: stakeHash, isPending: isStaking } = useWriteContract();
    const { isLoading: isStakeConfirming } = useWaitForTransactionReceipt({
      hash: stakeHash,
    });

    // Unstake tokens mutation
    const { writeContract: unstakeTokens, data: unstakeHash, isPending: isUnstaking } = useWriteContract();
    const { isLoading: isUnstakeConfirming } = useWaitForTransactionReceipt({
      hash: unstakeHash,
    });

    // Approve tokens mutation
    const { writeContract: approveTokens, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
      hash: approveHash,
    });

    // Claim tokens mutation
    const { writeContract: claimTokens, data: claimHash, isPending: isClaiming } = useWriteContract();
    const { isLoading: isClaimConfirming } = useWaitForTransactionReceipt({
      hash: claimHash,
    });

    // Vote on poll mutation
    const { writeContract: voteOnPoll, data: voteHash, isPending: isVoting } = useWriteContract();
    const { isLoading: isVoteConfirming } = useWaitForTransactionReceipt({
      hash: voteHash,
    });

    // Stake tokens function
    const stakeVSK = async (amount: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      const stakeAmount = parseEther(amount);
      return await stakeTokens({
        address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
        abi: VSK_TOKEN_ABI,
        functionName: 'stake',
        args: [stakeAmount],
      });
    };

    // Unstake tokens function
    const unstakeVSK = async (amount: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      const unstakeAmount = parseEther(amount);
      return await unstakeTokens({
        address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
        abi: VSK_TOKEN_ABI,
        functionName: 'unstake',
        args: [unstakeAmount],
      });
    };

    // Approve tokens function
    const approveVSK = async (amount: string, spender: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      const approveAmount = parseEther(amount);
      return await approveTokens({
        address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
        abi: VSK_TOKEN_ABI,
        functionName: 'approve',
        args: [spender as `0x${string}`, approveAmount],
      });
    };

    // Claim VSK tokens function
    const claimVSK = async (amount: string = '1000') => {
      if (!address) throw new Error('Wallet not connected');
      
      // Check if contract address is configured
      if (!CONTRACT_ADDRESSES.VSK_TOKEN || CONTRACT_ADDRESSES.VSK_TOKEN === '0x0000000000000000000000000000000000000000') {
        throw new Error('VSK token contract not deployed. Please contact the administrator.');
      }
      
      const claimAmount = parseEther(amount);
      return await claimTokens({
        address: CONTRACT_ADDRESSES.VSK_TOKEN as `0x${string}`,
        abi: VSK_TOKEN_ABI,
        functionName: 'claimTokens',
        args: [claimAmount],
      });
    };

    // Vote on poll function with real-time event simulation
    const voteOnPollContract = async (pollId: number, option: number, stakeAmount: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      // Check if contract address is configured
      if (!CONTRACT_ADDRESSES.PREDICTION_POLL || CONTRACT_ADDRESSES.PREDICTION_POLL === '0x0000000000000000000000000000000000000000') {
        throw new Error('Prediction poll contract not deployed. Please contact the administrator.');
      }
      
      const stakeAmountWei = parseEther(stakeAmount);
      
      try {
        const result = await voteOnPoll({
          address: CONTRACT_ADDRESSES.PREDICTION_POLL as `0x${string}`,
          abi: PREDICTION_POLL_ABI,
          functionName: 'vote',
          args: [BigInt(pollId), BigInt(option), stakeAmountWei],
        });

        // Simulate blockchain event for real-time updates
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('VoteCast', {
            detail: {
              pollId,
              voter: address,
              option,
              stakeAmount: stakeAmount,
              transactionHash: result,
              timestamp: Date.now()
            }
          }));
        }, 1000);

        return result;
      } catch (error) {
        console.error('Vote transaction failed:', error);
        throw error;
      }
    };

    // Generic token functions for any ERC20 token
    const getTokenBalance = async (tokenAddress: string, userAddress: string): Promise<string> => {
      try {
        // For VSK token, use the local balance system as fallback
        if (tokenAddress === CONTRACT_ADDRESSES.VSK_TOKEN) {
          return '0';
        }
        
        // For other tokens, try to use wagmi if available
        if (typeof window !== 'undefined' && window.ethereum) {
          const { useReadContract } = require('wagmi');
          const { data } = useReadContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress as `0x${string}`],
          });
          return data && typeof data === 'bigint' ? formatEther(data) : '0';
        }
        
        // Fallback to 0 if no Web3 provider
        return '0';
      } catch (error) {
        console.error('Error getting token balance:', error);
        return '0';
      }
    };

    const approveToken = async (tokenAddress: string, spender: string, amount: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      const approveAmount = parseEther(amount);
      approveTokens({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender as `0x${string}`, approveAmount],
      });
    };

    const transferToken = async (tokenAddress: string, to: string, amount: string) => {
      if (!address) throw new Error('Wallet not connected');
      
      const transferAmount = parseEther(amount);
      const { writeContract: transferToken } = require('wagmi').useWriteContract();
      transferToken({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to as `0x${string}`, transferAmount],
      });
    };

    // Refresh balances after transactions
    const refreshBalances = () => {
      queryClient.invalidateQueries({ queryKey: ['vskBalance', address] });
      queryClient.invalidateQueries({ queryKey: ['stakedBalance', address] });
      queryClient.invalidateQueries({ queryKey: ['ethBalance', address] });
    };

    // User profile data
    const userProfile: UserProfile | undefined = address ? {
      address,
      pollsCreated: Array.isArray(userPolls) ? userPolls.map(p => Number(p)) : [],
      votesCast: Array.isArray(userVotes) ? userVotes.map(p => Number(p)) : [],
      totalStaked: stakedBalance && typeof stakedBalance === 'bigint' ? formatEther(stakedBalance) : '0',
      totalRewards: '0', // This would need to be calculated from claim events
    } : undefined;

    return {
      // Connection state
      address,
      isConnected,
      chain,
      connect,
      disconnect,
      connectors,
      
      // Balances
      ethBalance: ethBalance ? formatEther(ethBalance.value) : '0',
      vskBalance: vskBalance && typeof vskBalance === 'bigint' ? formatEther(vskBalance) : '0',
      stakedBalance: stakedBalance && typeof stakedBalance === 'bigint' ? formatEther(stakedBalance) : '0',
      
      // User data
      userProfile,
      userPolls: Array.isArray(userPolls) ? userPolls.map(p => Number(p)) : [],
      userVotes: Array.isArray(userVotes) ? userVotes.map(p => Number(p)) : [],
      pollCounter: pollCounter ? Number(pollCounter) : 0,
      
      // Token operations
      stakeVSK,
      unstakeVSK,
      approveVSK,
      claimVSK,
      voteOnPollContract,
      getTokenBalance,
      approveToken,
      transferToken,
      isStaking: isStaking || isStakeConfirming,
      isUnstaking: isUnstaking || isUnstakeConfirming,
      isApproving: isApproving || isApproveConfirming,
      isClaiming: isClaiming || isClaimConfirming,
      isVoting: isVoting || isVoteConfirming,
      
      // Utilities
      refreshBalances,
    };
  } catch (error) {
    console.warn('Wagmi hooks not available:', error);
    
    // Return default values if wagmi is not available
    return {
      // Connection state
      address: null,
      isConnected: false,
      chain: null,
      connect: () => {},
      disconnect: () => {},
      connectors: [],
      
      // Balances
      ethBalance: '0',
      vskBalance: '0',
      stakedBalance: '0',
      
      // User data
      userProfile: undefined,
      userPolls: [],
      userVotes: [],
      pollCounter: 0,
      
      // Token operations
      stakeVSK: async () => {},
      unstakeVSK: async () => {},
      approveVSK: async () => {},
      claimVSK: async () => {},
      voteOnPollContract: async () => {},
      getTokenBalance: async () => '0',
      approveToken: async () => {},
      transferToken: async () => {},
      isStaking: false,
      isUnstaking: false,
      isApproving: false,
      isClaiming: false,
      isVoting: false,
      
      // Utilities
      refreshBalances: () => {},
    };
  }
}