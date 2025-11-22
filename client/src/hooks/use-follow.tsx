import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';

export function useFollow() {
  const { user } = useWallet();
  const queryClient = useQueryClient();

  const followUser = async (userId: string) => {
    if (!user) {
      throw new Error('User must be logged in to follow');
    }

    const response = await fetch(`/api/users/${userId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        followerId: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle specific error cases more gracefully
      if (response.status === 400 && error.message === 'Already following this user') {
        // Return success since the user is already following - no action needed
        return { success: true, message: 'Already following this user' };
      }
      throw new Error(error.message || 'Failed to follow user');
    }

    return response.json();
  };

  const unfollowUser = async (userId: string) => {
    if (!user) {
      throw new Error('User must be logged in to unfollow');
    }

    const response = await fetch(`/api/users/${userId}/follow`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        followerId: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle specific error cases more gracefully
      if (response.status === 400 && error.message === 'Not following this user') {
        // Return success since the user is not following - no action needed
        return { success: true, message: 'Not following this user' };
      }
      throw new Error(error.message || 'Failed to unfollow user');
    }

    return true;
  };

  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      // Handle specific error cases
      if (error.message === 'Already following this user') {
        // This is not really an error from user perspective, just update the UI
        queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/search/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      }
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      // Handle specific error cases
      if (error.message === 'Not following this user') {
        // This is not really an error from user perspective, just update the UI
        queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/search/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      }
    },
  });

  const isFollowing = (userId: string): boolean => {
    // This is a simple implementation - in a real app you might want to track this state
    // For now, we'll rely on the server data being refreshed after mutations
    return false;
  };

  return {
    followUser: followMutation.mutateAsync,
    unfollowUser: unfollowMutation.mutateAsync,
    isFollowing,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
  };
}
