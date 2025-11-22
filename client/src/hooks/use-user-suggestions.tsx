import { useQuery } from '@tanstack/react-query';

interface UserProfile {
  id: string;
  displayName: string;
  uniqueId: string;
  bio?: string;
  avatarUrl?: string;
  followersCount: number;
  vasksCount: number;
  isVerified: boolean;
  isFollowing: boolean;
  createdAt: string;
}

interface UserSuggestionsResponse {
  suggestions: UserProfile[];
}

export function useUserSuggestions(userId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['user-suggestions', userId, limit],
    queryFn: async (): Promise<UserProfile[]> => {
      if (!userId) return [];
      
      const response = await fetch(`/api/users/suggestions?userId=${userId}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user suggestions');
      }
      
      const suggestions = await response.json();
      return suggestions;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
