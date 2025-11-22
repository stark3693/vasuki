import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther, Address } from 'viem';
import { Poll, PollStatus } from '../lib/web3-config';
import { isWalletConnectConfigured } from '../config/env';
import { toast } from './use-toast';
import { hybridPollService, HybridPoll } from '../lib/hybrid-poll-service';
import { publicPollStorage } from '../lib/public-poll-storage';
import { useWallet } from './use-wallet';
import type { ServerPoll } from '../lib/web3-config';
import { livePollService } from '../lib/live-poll-service';
import { useEffect } from 'react';

export function usePolls() {
  const queryClient = useQueryClient();
  const isWeb3Ready = isWalletConnectConfigured();
  
  // Safely get wallet context
  let walletAddress: string | null = null;
  let isConnected = false;
  let user: any = null;
  
  try {
    const walletContext = useWallet();
    walletAddress = walletContext.walletAddress;
    isConnected = walletContext.isConnected;
    user = walletContext.user;
  } catch (error) {
    // Wallet context not available, use defaults
    console.warn('Wallet context not available in usePolls:', error);
  }

  // Set up real-time poll updates
  useEffect(() => {
    const handlePollUpdate = (update: any) => {
      console.log('🔄 Real-time poll update received:', update);
      
      // Invalidate and refetch polls data
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      
      // Show toast notification for important updates
      if (update.type === 'vote') {
        toast({
          title: '🗳️ New Vote Cast!',
          description: `Someone just voted on a poll. Poll data is updating in real-time.`,
        });
      } else if (update.type === 'poll_created') {
        toast({
          title: '🆕 New Poll Created!',
          description: `A new poll "${update.data.title}" has been created and is now live.`,
        });
      } else if (update.type === 'poll_resolved') {
        toast({
          title: '✅ Poll Resolved!',
          description: `A poll has been resolved. Check your rewards!`,
        });
      }
    };

    const handleRefreshPolls = () => {
      console.log('🔄 Refreshing polls due to real-time update');
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
    };

    // Start live poll service
    livePollService.startListening();
    livePollService.onUpdate(handlePollUpdate);
    
    // Listen for refresh events
    window.addEventListener('refreshPolls', handleRefreshPolls);

    return () => {
      livePollService.offUpdate(handlePollUpdate);
      window.removeEventListener('refreshPolls', handleRefreshPolls);
    };
  }, [queryClient]);

  // Public polls: visible to ALL users worldwide (via server API like vasks)
  const { data: serverPolls = [], isLoading: isLoadingPolls, error: pollsError } = useQuery<ServerPoll[]>({
    queryKey: ['/api/polls', user?.id, walletAddress],
    queryFn: async (): Promise<ServerPoll[]> => {
      try {
        console.log('🔍 Fetching polls with:', { userId: user?.id, walletAddress });
        const response = await fetch(`/api/polls?currentUserId=${user?.id || ''}&walletAddress=${walletAddress || ''}`);
        if (!response.ok) {
          console.error('Failed to fetch polls:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch polls: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('🔍 Successfully fetched polls:', data.length);
        return data;
      } catch (error) {
        console.error('🔍 Error in polls query:', error);
        throw error;
      }
    },
    enabled: isConnected, // Enable when wallet is connected, even if user object is still loading
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 3000, // Consider data stale after 3 seconds for faster updates
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Create poll mutation - WALLET REQUIRED
  const createPollMutation = useMutation({
    mutationFn: async (pollData: {
      title: string;
      description: string;
      options: string[];
      deadline: number;
    }) => {
      if (!walletAddress || !user?.id) {
        throw new Error('Wallet connection required to create polls');
      }

      // Use server API (like vasks)
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: user.id,
          title: pollData.title,
          description: pollData.description,
          options: pollData.options,
          deadline: new Date(pollData.deadline * 1000).toISOString(),
        }),
      });

      if (!response.ok) {
        // Try to get error message, but handle cases where response is not JSON
        let errorMessage = 'Failed to create poll';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON (e.g., HTML error page), get text
          const errorText = await response.text();
          console.error('Server returned non-JSON response:', errorText);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      toast({
        title: 'Poll Created!',
        description: 'Your poll is now live and visible to all users worldwide',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Vote mutation - WALLET REQUIRED
  const voteMutation = useMutation({
    mutationFn: async (voteData: {
      pollId: string;
      option: number;
    }) => {
      if (!walletAddress || !user?.id) {
        throw new Error('Wallet connection required to vote');
      }

      // Use server API (like vasks)
      const response = await fetch(`/api/polls/${voteData.pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          option: voteData.option,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote on poll');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      toast({
        title: 'Vote Cast!',
        description: 'Your vote has been recorded and is visible to all users worldwide',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resolve poll mutation - WALLET REQUIRED (creator only)
  const resolvePollMutation = useMutation({
    mutationFn: async (resolveData: {
      pollId: string;
      correctOption: number;
    }) => {
      if (!walletAddress || !user?.id) {
        throw new Error('Wallet connection required to resolve polls');
      }

      // Use server API (like vasks)
      const response = await fetch(`/api/polls/${resolveData.pollId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          correctOption: resolveData.correctOption,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resolve poll');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      
      
      toast({
        title: 'Poll Resolved!',
        description: 'Poll has been resolved and results are visible to all users',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (pollId: number) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      throw new Error('Staking rewards have been disabled');
    },
    onError: (error) => {
      toast({
        title: 'Staking Disabled',
        description: 'Staking functionality has been removed from polls',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    polls: serverPolls || [],
    pollCounter: serverPolls?.length || 0,
    isLoadingPolls,
    pollsError,
    
    // Mutations
    createPoll: createPollMutation.mutate,
    vote: voteMutation.mutate,
    resolvePoll: resolvePollMutation.mutate,
    claimReward: claimRewardMutation.mutate,
    
    // Loading states
    isCreating: createPollMutation.isPending,
    isVoting: voteMutation.isPending,
    isResolving: resolvePollMutation.isPending,
    isClaiming: claimRewardMutation.isPending,
    
    // Query functions - using server API
    getPoll: async (pollId: string) => {
      try {
        const response = await fetch(`/api/polls/${pollId}?currentUserId=${user?.id || ''}&walletAddress=${walletAddress || ''}`);
        if (!response.ok) {
          console.error('Failed to fetch poll:', response.status, response.statusText);
          // Return null instead of throwing error
          return { data: null };
        }
        return { data: await response.json() };
      } catch (error) {
        console.error('Error fetching poll:', error);
        // Return null instead of throwing error
        return { data: null };
      }
    },
    getPollVotes: async (pollId: string) => {
      try {
        const response = await fetch(`/api/polls/${pollId}?currentUserId=${user?.id || ''}&walletAddress=${walletAddress || ''}`);
        if (!response.ok) {
          console.error('Failed to fetch poll votes:', response.status, response.statusText);
          // Return empty votes array instead of throwing error
          return { data: [] };
        }
        const poll = await response.json();
        return { data: poll.votes || [] };
      } catch (error) {
        console.error('Error fetching poll votes:', error);
        // Return empty votes array instead of throwing error
        return { data: [] };
      }
    },
    getPollStakes: async (pollId: string) => {
      try {
        const response = await fetch(`/api/polls/${pollId}?currentUserId=${user?.id || ''}&walletAddress=${walletAddress || ''}`);
        if (!response.ok) {
          console.error('Failed to fetch poll stakes:', response.status, response.statusText);
          // Return empty stakes array instead of throwing error
          return { data: [] };
        }
        const poll = await response.json();
        return { data: poll.stakes || [] };
      } catch (error) {
        console.error('Error fetching poll stakes:', error);
        // Return empty stakes array instead of throwing error
        return { data: [] };
      }
    },
    hasUserVoted: async (pollId: string, userAddress: string) => {
      try {
        const response = await fetch(`/api/polls/${pollId}/has-voted?userAddress=${userAddress}`);
        if (!response.ok) {
          console.error('Failed to check user vote:', response.status, response.statusText);
          // Return false instead of throwing error
          return { data: false };
        }
        const result = await response.json();
        return { data: result.hasVoted };
      } catch (error) {
        console.error('Error checking user vote:', error);
        // Return false instead of throwing error
        return { data: false };
      }
    },
    getUserVote: async (pollId: string, userAddress: string) => {
      try {
        const response = await fetch(`/api/polls/${pollId}/user-vote?userAddress=${userAddress}`);
        if (!response.ok) {
          console.error('Failed to get user vote:', response.status, response.statusText);
          // Return null instead of throwing error
          return { data: null };
        }
        const result = await response.json();
        return { data: result.userVote };
      } catch (error) {
        console.error('Error getting user vote:', error);
        // Return null instead of throwing error
        return { data: null };
      }
    },
    
    // Utilities
    refreshPolls: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
    },
  };

}