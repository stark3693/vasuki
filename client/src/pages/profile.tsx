import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import VaskCard from "@/components/vask/vask-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Link as LinkIcon, Camera, UserPlus, UserMinus, Users, Edit3, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { UserProfile, VaskWithAuthor } from "@shared/schema";

export default function ProfilePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    uniqueId: '',
    profileImage: null as File | null,
    coverImage: null as File | null,
  });
  const [usernameCheck, setUsernameCheck] = useState<{ available: boolean; message: string } | null>(null);

  const profileId = params.id || user?.id;
  const isOwnProfile = user?.id === profileId;

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", profileId, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileId}?currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!profileId && isConnected,
  });

  const { data: userVasks, isLoading: vasksLoading } = useQuery<VaskWithAuthor[]>({
    queryKey: ["/api/users", profileId, "vasks", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileId}/vasks?currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch user vasks');
      return response.json();
    },
    enabled: !!profileId && isConnected,
  });

  const { data: followers } = useQuery({
    queryKey: ["/api/users", profileId, "followers"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileId}/followers`);
      if (!response.ok) throw new Error('Failed to fetch followers');
      return response.json();
    },
    enabled: !!profileId && isConnected,
  });

  const { data: following } = useQuery({
    queryKey: ["/api/users", profileId, "following"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileId}/following`);
      if (!response.ok) throw new Error('Failed to fetch following');
      return response.json();
    },
    enabled: !!profileId && isConnected,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${profileId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to follow user');
      return response.json();
    },
    onMutate: async () => {
      // Optimistic update
      setIsFollowing(true);
      await queryClient.cancelQueries({ queryKey: ["/api/users", profileId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileId] });
    },
    onError: () => {
      // Revert on error
      setIsFollowing(false);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${profileId}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to unfollow user');
      return response.json();
    },
    onMutate: async () => {
      // Optimistic update
      setIsFollowing(false);
      await queryClient.cancelQueries({ queryKey: ["/api/users", profileId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileId] });
    },
    onError: () => {
      // Revert on error
      setIsFollowing(true);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // First update username if it changed
      if (editForm.uniqueId && editForm.uniqueId !== profile?.uniqueId) {
        const usernameResponse = await fetch(`/api/users/${profileId}/username?currentUserId=${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uniqueId: editForm.uniqueId }),
        });
        if (!usernameResponse.ok) {
          const error = await usernameResponse.json();
          throw new Error(error.message || 'Failed to update username');
        }
      }
      
      // Then update other profile data
      const response = await fetch(`/api/users/${profileId}`, {
        method: 'PATCH',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileId, "vasks"] });
      setIsEditing(false);
      setEditForm({ displayName: '', bio: '', uniqueId: '', profileImage: null, coverImage: null });
      setUsernameCheck(null);
      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        uniqueId: profile.uniqueId || '',
        profileImage: null,
        coverImage: null,
      });
      setIsEditing(true);
    }
  };

  const checkUsername = async (username: string) => {
    if (!username || username === profile?.uniqueId) {
      setUsernameCheck(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/username/check/${username}?currentUserId=${user?.id}`);
      const result = await response.json();
      setUsernameCheck(result);
    } catch (error) {
      console.error('Username check failed:', error);
    }
  };

  const handleSaveProfile = () => {
    if (usernameCheck && !usernameCheck.available) {
      return; // Don't save if username is not available
    }
    
    const formData = new FormData();
    formData.append('displayName', editForm.displayName);
    formData.append('bio', editForm.bio);
    formData.append('uniqueId', editForm.uniqueId);
    if (editForm.profileImage) {
      formData.append('profileImage', editForm.profileImage);
    }
    if (editForm.coverImage) {
      formData.append('coverImage', editForm.coverImage);
    }
    updateProfileMutation.mutate(formData);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profileImage' | 'coverImage') => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm(prev => ({ ...prev, [type]: file }));
    }
  };

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing || false);
    }
  }, [profile]);

  if (!isConnected || !user) {
    return null;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/home")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-full overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/home")}
                data-testid="button-back"
                className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate" data-testid="profile-title">
                  {profile.displayName || profile.ensName || `${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`}
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
                {isOwnProfile && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10"
                    data-testid="button-edit-cover"
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
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
                    {isOwnProfile && (
                      <Button
                        size="icon"
                        className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full"
                        data-testid="button-edit-avatar"
                      >
                        <Camera className="text-xs sm:text-sm" />
                      </Button>
                    )}
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
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all" data-testid="text-wallet-address">
                          {profile.walletAddress}
                        </p>
                        <p className="text-xs sm:text-sm text-primary font-medium truncate" data-testid="text-unique-id">
                          @{profile.uniqueId}
                        </p>
                      </div>
                      {isOwnProfile ? (
                        <Dialog open={isEditing} onOpenChange={setIsEditing}>
                          <DialogTrigger asChild>
                            <Button
                              className="creative-gradient emotion-hover w-full sm:w-auto"
                              onClick={handleEditProfile}
                              data-testid="button-edit-profile"
                            >
                              <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm">Edit Profile</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 w-[calc(100vw-2rem)] sm:w-auto">
                            <DialogHeader>
                              <DialogTitle className="text-lg sm:text-xl">Edit Profile</DialogTitle>
                              <DialogDescription className="text-sm sm:text-base">
                                Update your profile information and images.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Username</label>
                                <div className="mt-1">
                                  <Input
                                    value={editForm.uniqueId}
                                    onChange={(e) => {
                                      setEditForm(prev => ({ ...prev, uniqueId: e.target.value }));
                                      // Debounce username check
                                      setTimeout(() => checkUsername(e.target.value), 500);
                                    }}
                                    placeholder="Enter your username"
                                    className={usernameCheck && !usernameCheck.available ? 'border-red-500' : ''}
                                  />
                                  {usernameCheck && (
                                    <p className={`text-xs mt-1 ${usernameCheck.available ? 'text-green-600' : 'text-red-600'}`}>
                                      {usernameCheck.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                  value={editForm.displayName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                  placeholder="Enter your display name"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Bio</label>
                                <Textarea
                                  value={editForm.bio}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                  placeholder="Tell us about yourself..."
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Profile Picture</label>
                                <div className="mt-1 flex items-center space-x-4">
                                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                                    {editForm.profileImage ? (
                                      <img
                                        src={URL.createObjectURL(editForm.profileImage)}
                                        alt="Profile preview"
                                        className="w-16 h-16 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-2xl font-bold text-white">
                                        {(profile?.displayName || profile?.ensName || profile?.walletAddress)[0].toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, 'profileImage')}
                                    className="hidden"
                                    id="profile-image"
                                  />
                                  <label
                                    htmlFor="profile-image"
                                    className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Camera className="h-4 w-4 mr-2 inline" />
                                    Choose Image
                                  </label>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Cover Image</label>
                                <div className="mt-1">
                                  <div className="w-full h-24 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                                    {editForm.coverImage ? (
                                      <img
                                        src={URL.createObjectURL(editForm.coverImage)}
                                        alt="Cover preview"
                                        className="w-full h-24 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">Cover image preview</span>
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, 'coverImage')}
                                    className="hidden"
                                    id="cover-image"
                                  />
                                  <label
                                    htmlFor="cover-image"
                                    className="mt-2 inline-block px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Camera className="h-4 w-4 mr-2 inline" />
                                    Choose Cover
                                  </label>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                disabled={updateProfileMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveProfile}
                                disabled={updateProfileMutation.isPending}
                                className="creative-gradient"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="flex space-x-2 w-full sm:w-auto">
                          {isFollowing ? (
                            <Button
                              variant="outline"
                              onClick={() => unfollowMutation.mutate()}
                              disabled={unfollowMutation.isPending}
                              data-testid="button-unfollow"
                              className="flex-1 sm:flex-none"
                            >
                              <UserMinus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm">
                                {unfollowMutation.isPending ? "Unfollowing..." : "Following"}
                              </span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => followMutation.mutate()}
                              disabled={followMutation.isPending}
                              data-testid="button-follow"
                              className="flex-1 sm:flex-none"
                            >
                              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm">
                                {followMutation.isPending ? "Following..." : "Follow"}
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {profile.bio && (
                      <p className="text-foreground leading-relaxed text-sm sm:text-base break-words" data-testid="text-bio">
                        {profile.bio}
                      </p>
                    )}

                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="inline mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Joined </span>
                        <span className="sm:hidden">Joined </span>
                        {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                      <button 
                        onClick={() => setShowFollowers(true)}
                        className="hover:text-primary transition-colors"
                      >
                        <strong data-testid="text-followers-count">{profile.followersCount}</strong>{" "}
                        <span className="text-muted-foreground">Followers</span>
                      </button>
                      <button 
                        onClick={() => setShowFollowing(true)}
                        className="hover:text-primary transition-colors"
                      >
                        <strong data-testid="text-following-count">{profile.followingCount}</strong>{" "}
                        <span className="text-muted-foreground">Following</span>
                      </button>
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
                  {isOwnProfile 
                    ? "You haven't posted any vasks yet." 
                    : "This user hasn't posted any vasks yet."
                  }
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg w-full max-w-md max-h-96 overflow-hidden">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Followers</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFollowers(false)}
                className="mobile-touch-target"
              >
                ✕
              </Button>
            </div>
            <div className="p-3 sm:p-4 max-h-80 overflow-y-auto">
              {followers?.length ? (
                <div className="space-y-2 sm:space-y-3">
                  {followers.map((follower: any) => (
                    <div key={follower.id} className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm sm:text-base">
                          {(follower.displayName || follower.ensName || follower.walletAddress)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{follower.displayName || follower.ensName || "Anonymous"}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                          {follower.walletAddress.slice(0, 6)}...{follower.walletAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">No followers yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg w-full max-w-md max-h-96 overflow-hidden">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Following</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFollowing(false)}
                className="mobile-touch-target"
              >
                ✕
              </Button>
            </div>
            <div className="p-3 sm:p-4 max-h-80 overflow-y-auto">
              {following?.length ? (
                <div className="space-y-2 sm:space-y-3">
                  {following.map((user: any) => (
                    <div key={user.id} className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm sm:text-base">
                          {(user.displayName || user.ensName || user.walletAddress)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{user.displayName || user.ensName || "Anonymous"}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">Not following anyone yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
