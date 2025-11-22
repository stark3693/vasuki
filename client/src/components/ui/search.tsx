import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";

interface SearchProps {
  onUserSelect?: (user: UserProfile) => void;
  placeholder?: string;
}

export default function UserSearch({ onUserSelect, placeholder = "Search users by username..." }: SearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/search/users", query, user?.id],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}&currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();
      console.log('🔍 UserSearch received results:', results.slice(0, 3).map((result: any) => ({
        id: result.id,
        displayName: result.displayName,
        isFollowing: result.isFollowing,
        currentUserId: user?.id
      })));
      return results;
    },
    enabled: query.length >= 2,
  });

  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      console.log('🔍 UserSearch Follow Debug:', {
        userId,
        isFollowing,
        currentUserId: user?.id,
        userIdType: typeof userId,
        currentUserIdType: typeof user?.id,
        userObject: user
      });
      
      if (!user?.id) {
        console.error('❌ UserSearch: Current user not found', { user });
        throw new Error('Current user not found');
      }
      
      if (!userId) {
        console.error('❌ UserSearch: User ID not found', { userId });
        throw new Error('User ID not found');
      }
      
      // Prevent self-follow
      if (userId === user.id) {
        console.error('❌ UserSearch: Cannot follow yourself', { userId, currentUserId: user.id });
        throw new Error('You cannot follow yourself');
      }
      
      const requestData = { followerId: user.id };
      console.log('📤 UserSearch Sending request data:', requestData);
      console.log('📤 UserSearch Request URL:', `/api/users/${userId}/follow`);
      
      if (isFollowing) {
        console.log('🗑️ UserSearch Unfollowing user:', userId);
        return await apiRequest('DELETE', `/api/users/${userId}/follow`, requestData);
      } else {
        console.log('➕ UserSearch Following user:', userId);
        return await apiRequest('POST', `/api/users/${userId}/follow`, requestData);
      }
    },
    onSuccess: () => {
      console.log('✅ UserSearch Follow mutation onSuccess - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["/api/search/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      toast({
        title: "Following User",
        description: "You are now following this user.",
      });
    },
    onError: (error) => {
      console.error('❌ UserSearch Follow mutation error:', error);
      
      let errorMessage = "Failed to follow user. Please try again.";
      if (error.message === 'You cannot follow yourself') {
        errorMessage = "You cannot follow yourself.";
      } else if (error.message === 'Cannot follow yourself') {
        errorMessage = "You cannot follow yourself.";
      } else if (error.message === 'Already following this user') {
        errorMessage = "You are already following this user.";
      }
      
      toast({
        title: "Follow Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSelect = (user: UserProfile) => {
    onUserSelect?.(user);
    setIsOpen(false);
    setQuery("");
  };

  const handleFollow = (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation();
    followMutation.mutate({ userId, isFollowing });
  };

  const handleUsernameClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    window.location.href = `/u/${username}`;
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 emotion-hover-serpent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {searchResults && searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleUserSelect(result)}
                    className="flex items-center space-x-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.profileImage || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(result.displayName || result.ensName || result.walletAddress)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {result.displayName || result.ensName || "Anonymous"}
                      </p>
                      <p 
                        className="text-sm text-primary font-medium truncate cursor-pointer hover:underline"
                        onClick={(e) => handleUsernameClick(e, result.uniqueId)}
                      >
                        @{result.uniqueId}
                      </p>
                      {result.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {result.bio}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={result.isFollowing ? "outline" : "default"}
                      onClick={(e) => {
                        console.log('🔍 Follow button clicked:', { 
                          userId: result.id, 
                          isFollowing: result.isFollowing,
                          currentUserId: user?.id 
                        });
                        handleFollow(e, result.id, result.isFollowing || false);
                      }}
                      disabled={followMutation.isPending}
                      className="shrink-0"
                    >
                      {followMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ...
                        </>
                      ) : result.isFollowing ? (
                        <>
                          <UserMinus className="h-3 w-3 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : query.length >= 2 && !isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <p>No users found for "{query}"</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
