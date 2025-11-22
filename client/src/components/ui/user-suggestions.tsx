import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { UserPlus, Users, MessageCircle, Calendar } from 'lucide-react';
import { UserProfile } from '../../shared/sqlite-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';

interface UserSuggestionsProps {
  suggestions: UserProfile[];
  currentUserId: string;
  onRefresh?: () => void;
  className?: string;
}

export function UserSuggestions({ 
  suggestions, 
  currentUserId, 
  onRefresh, 
  className = "" 
}: UserSuggestionsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  // Initialize follow states from suggestions
  React.useEffect(() => {
    const states: Record<string, boolean> = {};
    suggestions.forEach(user => {
      states[user.id] = user.isFollowing || false;
    });
    setFollowStates(states);
  }, [suggestions]);

  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      console.log('🔍 UserSuggestions Follow Debug:', {
        userId,
        isFollowing,
        currentUserId,
        userIdType: typeof userId,
        currentUserIdType: typeof currentUserId
      });
      
      if (!currentUserId) {
        throw new Error('Current user not found');
      }
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Prevent self-follow
      if (userId === currentUserId) {
        console.error('❌ UserSuggestions: Cannot follow yourself', { userId, currentUserId });
        throw new Error('You cannot follow yourself');
      }
      
      const requestData = { followerId: currentUserId };
      console.log('📤 UserSuggestions Sending request data:', requestData);
      
      if (isFollowing) {
        console.log('🗑️ UserSuggestions Unfollowing user:', userId);
        return await apiRequest('DELETE', `/api/users/${userId}/follow`, requestData);
      } else {
        console.log('➕ UserSuggestions Following user:', userId);
        return await apiRequest('POST', `/api/users/${userId}/follow`, requestData);
      }
    },
    onMutate: async ({ userId, isFollowing }) => {
      console.log('🚀 UserSuggestions Follow mutation onMutate:', { userId, isFollowing, newState: !isFollowing });
      // Optimistic update - immediately update UI
      setFollowStates(prev => ({
        ...prev,
        [userId]: !isFollowing
      }));
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-suggestions'] });
      await queryClient.cancelQueries({ queryKey: ['/api/search/users'] });
      await queryClient.cancelQueries({ queryKey: ['/api/users'] });
    },
    onSuccess: () => {
      console.log('✅ UserSuggestions Follow mutation onSuccess - invalidating queries');
      // Invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onRefresh?.();
    },
    onError: (error, { userId, isFollowing }) => {
      console.error('❌ UserSuggestions Follow mutation error:', error);
      // Revert optimistic update on error
      setFollowStates(prev => ({
        ...prev,
        [userId]: isFollowing
      }));
      
      let errorMessage = "Failed to update follow status. Please try again.";
      if (error.message === 'You cannot follow yourself') {
        errorMessage = "You cannot follow yourself.";
      } else if (error.message === 'Cannot follow yourself') {
        errorMessage = "You cannot follow yourself.";
      } else if (error.message === 'Already following this user') {
        errorMessage = "You are already following this user.";
      }
      
      toast({
        title: "Action Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleFollowToggle = async (userId: string, isCurrentlyFollowing: boolean) => {
    followMutation.mutate({ userId, isFollowing: isCurrentlyFollowing });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (date: string) => {
    const joinDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Joined today';
    if (diffDays < 7) return `Joined ${diffDays} days ago`;
    if (diffDays < 30) return `Joined ${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Joined ${Math.ceil(diffDays / 30)} months ago`;
    return `Joined ${Math.ceil(diffDays / 365)} years ago`;
  };

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-500" />
            Suggested Users
          </CardTitle>
          <CardDescription>
            Discover new people to follow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suggestions available right now.</p>
            <p className="text-sm mt-2">Check back later for new recommendations!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-blue-500" />
          Suggested Users
        </CardTitle>
        <CardDescription>
          Discover new people to follow based on your interests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((user) => {
          const isCurrentlyFollowing = followStates[user.id] ?? user.isFollowing ?? false;
          return (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Avatar className="h-14 w-14 sm:h-12 sm:w-12">
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback className="text-base font-semibold">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-1">
                    <h4 className="font-semibold text-base sm:text-sm truncate">
                      {user.displayName}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono sm:ml-2">
                      @{user.uniqueId}
                    </span>
                  </div>
                  {user.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {user.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{user.followersCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{user.vasksCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatJoinDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                  size="sm"
                  variant={isCurrentlyFollowing ? "outline" : "default"}
                  onClick={() => handleFollowToggle(user.id, isCurrentlyFollowing)}
                  disabled={followMutation.isPending}
                  className="h-9 px-4 text-xs whitespace-nowrap w-full sm:w-auto"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  {followMutation.isPending ? '...' : (isCurrentlyFollowing ? 'Following' : 'Follow')}
                </Button>
                {user.isVerified && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 w-full sm:w-auto text-center">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
