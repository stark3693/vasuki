import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import VaskCard from "@/components/vask/vask-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, AlertCircle } from "lucide-react";

import type { UserProfile, VaskWithAuthor } from "@shared/schema";

export default function UsernameProfilePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const username = params.username;

  // First, get the user by username to get their ID
  const { data: userByUsername, isLoading: userLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/users/by-username", username, user?.id],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      const response = await fetch(`/api/users/by-username/${username}?currentUserId=${user?.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: !!username && isConnected,
    retry: false,
  });

  // Then get the user's vasks using their ID
  const { data: userVasks, isLoading: vasksLoading } = useQuery<VaskWithAuthor[]>({
    queryKey: ["/api/users", userByUsername?.id, "vasks", user?.id],
    queryFn: async () => {
      if (!userByUsername?.id) throw new Error('User ID is required');
      const response = await fetch(`/api/users/${userByUsername.id}/vasks?currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch user vasks');
      return response.json();
    },
    enabled: !!userByUsername?.id && isConnected,
  });

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    if (userByUsername) {
      setProfile(userByUsername);
    }
  }, [userByUsername]);

  if (!isConnected || !user) {
    return null;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
          <Skeleton className="h-48 w-full" />
          <div className="responsive-padding space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center responsive-container responsive-spacing">
        <div className="text-center max-w-md mx-auto responsive-padding">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="responsive-heading font-bold text-foreground mb-2">User Not Found</h1>
          <p className="responsive-text text-muted-foreground mb-4">
            The username <strong>@{username}</strong> doesn't exist or may have been changed.
          </p>
          <div className="space-y-3">
            <Button onClick={() => setLocation("/search")} className="w-full mobile-touch-target">
              Search for Users
            </Button>
            <Button variant="outline" onClick={() => setLocation("/home")} className="w-full mobile-touch-target">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background responsive-container responsive-spacing">
      <div className="responsive-flex">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10 mobile-sticky">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/search")}
                data-testid="button-back"
                className="mobile-touch-target"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate" data-testid="profile-title">
                  @{profile.uniqueId}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">{profile.vaskCount} Vasks</p>
              </div>
            </div>
          </header>

          {/* Profile Header */}
          <div className="bg-card border-b border-border">
            <div className="relative">
              {/* Cover Image */}
              <div className="h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-primary to-secondary relative">
                {profile.coverImage && (
                  <img 
                    src={profile.coverImage} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Profile Info */}
              <div className="relative px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4">
                  <div className="relative -mt-12 sm:-mt-16 mb-3 sm:mb-4 lg:mb-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-accent rounded-full border-2 sm:border-4 border-background flex items-center justify-center overflow-hidden">
                      {profile.profileImage ? (
                        <img 
                          src={profile.profileImage} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                          {(profile.displayName || profile.ensName || profile.walletAddress)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                    <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="text-display-name">
                          {profile.displayName || profile.ensName || "Anonymous"}
                        </h1>
                        {profile.ensName && (
                          <p className="text-sm sm:text-base text-muted-foreground truncate" data-testid="text-ens-name">
                            {profile.ensName}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-primary font-medium truncate" data-testid="text-unique-id">
                          @{profile.uniqueId}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all" data-testid="text-wallet-address">
                          {profile.walletAddress}
                        </p>
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-foreground leading-relaxed text-sm sm:text-base break-words" data-testid="text-bio">
                        {profile.bio}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                      <span>
                        <strong data-testid="text-followers-count">{profile.followersCount}</strong>{" "}
                        <span className="text-muted-foreground">Followers</span>
                      </span>
                      <span>
                        <strong data-testid="text-following-count">{profile.followingCount}</strong>{" "}
                        <span className="text-muted-foreground">Following</span>
                      </span>
                      <span>
                        <strong data-testid="text-vask-count">{profile.vaskCount}</strong>{" "}
                        <span className="text-muted-foreground">Vasks</span>
                      </span>
                      <span>
                        <strong data-testid="text-like-count">{profile.likeCount}</strong>{" "}
                        <span className="text-muted-foreground">Likes</span>
                      </span>
                      <span>
                        <strong data-testid="text-comment-count">{profile.commentCount}</strong>{" "}
                        <span className="text-muted-foreground">Comments</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="border-b border-border overflow-x-auto">
            <nav className="flex min-w-max">
              <button className="px-3 sm:px-6 py-3 sm:py-4 border-b-2 border-primary text-primary font-medium text-sm sm:text-base">
                Vasks
              </button>
              <button className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base">
                Likes
              </button>
              <button className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base">
                Comments
              </button>
            </nav>
          </div>

          {/* Profile Content */}
          <div className="divide-y divide-border">
            {vasksLoading ? (
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 sm:space-y-3">
                    <div className="flex space-x-2 sm:space-x-3">
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/4 sm:h-4" />
                        <Skeleton className="h-3 w-full sm:h-4" />
                        <Skeleton className="h-3 w-3/4 sm:h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userVasks && userVasks.length > 0 ? (
              userVasks.map((vask) => (
                <VaskCard key={vask.id} vask={vask} currentUser={user} />
              ))
            ) : (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <p className="text-sm sm:text-base">
                  This user hasn't posted any vasks yet.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
