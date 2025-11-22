import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useIsMobile } from "@/hooks/use-mobile";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import UserSearch from "@/components/ui/search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUserSuggestions } from "@/hooks/use-user-suggestions";
import { UserSuggestions } from "@/components/ui/user-suggestions";
import type { UserProfile } from "../../shared/sqlite-schema";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const isMobile = useIsMobile();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { data: trendingUsers } = useQuery<UserProfile[]>({
    queryKey: ["/api/search/users", "trending", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/search/users?q=trending&currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch trending users');
      return response.json();
    },
    enabled: isConnected,
  });

  const { data: userSuggestions, refetch: refetchSuggestions } = useUserSuggestions(user?.id, 5);

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  if (!isConnected || !user) {
    return null;
  }

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setLocation(`/profile/${user.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 lg:border-r border-border min-w-0 max-w-full overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold truncate" data-testid="page-title">Search Users</h2>
            </div>
          </header>

          {/* Search Content */}
          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Search Bar */}
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Find People</h3>
              <UserSearch 
                onUserSelect={handleUserSelect}
                placeholder="Search by username, display name, or wallet address..."
              />
            </div>

            {/* User Suggestions */}
            {userSuggestions && userSuggestions.length > 0 && (
              <UserSuggestions 
                suggestions={userSuggestions} 
                currentUserId={user.id} 
                onRefresh={refetchSuggestions}
              />
            )}

            {/* Trending Users */}
            {trendingUsers && trendingUsers.length > 0 && (
              <Card className="serpent-border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span>Trending Users</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {trendingUsers.slice(0, 6).map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors emotion-hover-serpent"
                      >
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {(user.displayName || user.ensName || user.walletAddress)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {user.displayName || user.ensName || "Anonymous"}
                          </p>
                          <p 
                            className="text-sm text-primary font-medium truncate cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/u/${user.uniqueId}`;
                            }}
                          >
                            @{user.uniqueId}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span>{user.followersCount} followers</span>
                            <span>{user.vaskCount} vasks</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Tips */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Search Tips</span>
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Username search:</strong> Type @username to find specific users</li>
                  <li>• <strong>Display name:</strong> Search by real names or ENS names</li>
                  <li>• <strong>Wallet address:</strong> Partial wallet address matches</li>
                  <li>• <strong>Minimum 2 characters</strong> required to start searching</li>
                  <li>• <strong>Unique usernames</strong> make it easy to find and mention users</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Right Sidebar - Desktop */}
        {/* Discover card removed from right sidebar as requested */}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}