import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useEncryption } from "@/hooks/use-encryption";
import { decryptTextContent } from "@/lib/encryption";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, MoreHorizontal, UserPlus, UserMinus, Trash2, Image, Video, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CommentSection from "./comment-section";
import RevolutionaryVaskCard from "./revolutionary-vask-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { VaskWithAuthor, User } from "@shared/schema";

interface VaskCardProps {
  vask: VaskWithAuthor;
  currentUser: User;
}

// Helper function to detect revolutionary features
const isRevolutionaryFeature = (content: string) => {
  const revolutionaryKeywords = [
    'DNA Evolution', '#DNAEvolution', 'VaskBreeding',
    'Quantum Entanglement', '#QuantumEntanglement',
    'Holographic', '#Holographic',
    'Lightning Network', '#LightningNetwork',
    'Sound Wave', '#SoundWave'
  ];
  
  return revolutionaryKeywords.some(keyword => 
    content.includes(keyword)
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function VaskCard({ vask, currentUser }: VaskCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isFollowing, setIsFollowing] = useState(vask.author.isFollowing || false);
  const [, setLocation] = useLocation();
  const { decryptText, isDataEncrypted } = useEncryption();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync local isFollowing state with vask.author.isFollowing prop
  useEffect(() => {
    console.log('🔄 VaskCard useEffect - syncing isFollowing:', {
      vaskId: vask.id,
      authorId: vask.authorId,
      authorIsFollowing: vask.author.isFollowing,
      currentLocalState: isFollowing
    });
    setIsFollowing(vask.author.isFollowing || false);
  }, [vask.author.isFollowing, vask.id, vask.authorId]);

  // Decrypt content if it's encrypted
  const getDecryptedContent = () => {
    console.log('🔍 Vask Debug:', {
      id: vask.id,
      content: vask.content,
      contentEncrypted: vask.contentEncrypted,
      isEncrypted: vask.isEncrypted,
      authorWalletAddress: vask.author?.walletAddress
    });
    
    // If content is encrypted and we have encrypted data, try to decrypt it
    if (vask.isEncrypted && vask.contentEncrypted && isDataEncrypted(vask.contentEncrypted)) {
      try {
        console.log('🔓 Attempting to decrypt content...');
        const decryptedContent = decryptTextContent(vask.contentEncrypted, vask.author.walletAddress);
        console.log('✅ Decryption successful:', decryptedContent);
        return decryptedContent;
      } catch (error) {
        console.error('❌ Failed to decrypt content:', error);
        // Fall back to regular content if decryption fails
        return vask.content || '[Content could not be decrypted]';
      }
    }
    
    // Use regular content if not encrypted or if decryption failed
    console.log('📝 Using regular content:', vask.content);
    return vask.content || '';
  };

  const displayContent = getDecryptedContent();

  const likeMutation = useMutation({
    mutationFn: async ({ vaskId, isLiked }: { vaskId: string; isLiked: boolean }) => {
      if (isLiked) {
        return await apiRequest('DELETE', `/api/vasks/${vaskId}/like`, { userId: currentUser.id });
      } else {
        return await apiRequest('POST', `/api/vasks/${vaskId}/like`, { userId: currentUser.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser.id, 'vasks'] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  });

  const followMutation = useMutation({
    mutationFn: async ({ authorId, isFollowing }: { authorId: string; isFollowing: boolean }) => {
      console.log('🔍 Follow Debug:', {
        authorId,
        isFollowing,
        currentUserId: currentUser?.id,
        currentUser: currentUser,
        authorIdType: typeof authorId,
        currentUserIdType: typeof currentUser?.id
      });
      
      if (!currentUser?.id) {
        throw new Error('Current user not found');
      }
      
      if (!authorId) {
        throw new Error('Author ID not found');
      }
      
      const requestData = { followerId: currentUser.id };
      console.log('📤 Sending request data:', requestData);
      
      if (isFollowing) {
        console.log('🗑️ Unfollowing user:', authorId);
        return await apiRequest('DELETE', `/api/users/${authorId}/follow`, requestData);
      } else {
        console.log('➕ Following user:', authorId);
        return await apiRequest('POST', `/api/users/${authorId}/follow`, requestData);
      }
    },
    onMutate: async ({ isFollowing }) => {
      console.log('🚀 Follow mutation onMutate:', { isFollowing, newState: !isFollowing });
      // Optimistic update - immediately update UI
      setIsFollowing(!isFollowing);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/vasks'] });
      await queryClient.cancelQueries({ queryKey: ['/api/users'] });
      // Also cancel user-specific queries
      if (currentUser?.id) {
        await queryClient.cancelQueries({ queryKey: ['/api/vasks', currentUser.id] });
      }
    },
    onSuccess: () => {
      console.log('✅ Follow mutation onSuccess - invalidating queries');
      // Invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      // Also invalidate with user-specific keys
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/vasks', currentUser.id] });
      }
    },
    onError: (error, { isFollowing }) => {
      // Revert optimistic update on error
      setIsFollowing(isFollowing);
      toast({
        title: "Action Failed",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (vaskId: string) => {
      return await apiRequest('DELETE', `/api/vasks/${vaskId}`, { userId: currentUser.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser.id, 'vasks'] });
      toast({
        title: "Vask Deleted",
        description: "Your vask has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete vask. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleLike = () => {
    likeMutation.mutate({ vaskId: vask.id, isLiked: vask.isLiked });
  };

  const handleFollow = () => {
    followMutation.mutate({ authorId: vask.authorId, isFollowing: isFollowing });
  };

  const handleAuthorClick = () => {
    setLocation(`/profile/${vask.authorId}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Vask by ${vask.author?.ensName || vask.author?.displayName || 'Anonymous'}`,
        text: displayContent || "",
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Vask link copied to clipboard.",
      });
    }
  };

  const formatTimeAgo = (date: Date | string | undefined) => {
    if (!date) return "Unknown";
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return "Unknown";
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "now";
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return `${Math.floor(diffInMinutes / 1440)}d`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return "Unknown";
    }
  };

  // Check if this is a revolutionary feature
  const isRevolutionary = displayContent ? isRevolutionaryFeature(displayContent) : false;

  // If it's a revolutionary feature, use the special component
  if (isRevolutionary) {
    return <RevolutionaryVaskCard vask={vask} currentUser={currentUser} />;
  }

  return (
    <article className="vask-card p-5 sm:p-6 hover:bg-accent/30 transition-all duration-200 border-l-4 border-l-secondary/60" data-testid={`vask-card-${vask.id}`}>
      <div className="flex space-x-4">
        <div className="w-14 h-14 bg-gradient-to-r from-secondary to-primary rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg">
          {vask.author?.profileImage ? (
            <img 
              src={vask.author.profileImage} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-white font-bold text-lg">
              {(vask.author?.displayName || vask.author?.ensName || vask.author?.walletAddress || "U")[0].toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-sm">
              <button 
                onClick={handleAuthorClick}
                className="font-semibold hover:text-primary transition-colors cursor-pointer text-base"
                data-testid={`text-author-${vask.id}`}
              >
                {vask.author?.ensName || vask.author?.displayName || "Anonymous"}
              </button>
              <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-md" data-testid={`text-unique-id-${vask.id}`}>
                @{vask.author?.uniqueId}
              </span>
              <span className="text-muted-foreground font-mono text-xs" data-testid={`text-address-${vask.id}`}>
                {vask.author?.walletAddress ? `${vask.author.walletAddress.slice(0, 6)}...${vask.author.walletAddress.slice(-4)}` : "unknown"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs" data-testid={`text-timestamp-${vask.id}`}>
                {formatTimeAgo(new Date(vask.createdAt))}
              </span>
              {vask.isPinned && (
                <span className="text-primary text-xs font-medium bg-primary/10 px-2 py-1 rounded-md">📌 Pinned</span>
              )}
            </div>
            
            {/* Enhanced Follow button - only show if not current user's post */}
            {vask.authorId !== currentUser.id && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollow}
                disabled={followMutation.isPending}
                className={`ml-2 transition-all duration-200 hover:scale-105 ${
                  isFollowing 
                    ? "border-primary/20 text-primary hover:bg-primary/10" 
                    : "btn-primary"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    {followMutation.isPending ? "Unfollowing..." : "Following"}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {followMutation.isPending ? "Following..." : "Follow"}
                  </>
                )}
              </Button>
            )}
          </div>
          
          {displayContent && (
            <p className="text-foreground leading-relaxed text-base" data-testid={`text-content-${vask.id}`}>
              {displayContent}
            </p>
          )}
          
          {/* Display Media Files */}
          {vask.mediaUrls && vask.mediaUrls.length > 0 && (
            <div className="mt-3 space-y-3">
              {vask.mediaUrls.map((mediaUrl, index) => {
                const mediaType = vask.mediaTypes?.[index] || 'file';
                const mediaFilename = vask.mediaFilenames?.[index] || 'Unknown file';
                const mediaSize = vask.mediaSizes?.[index] || 0;
                
                return (
                  <div key={index} className="relative">
                    {mediaType === 'image' ? (
                      <img 
                        src={mediaUrl} 
                        alt={mediaFilename}
                        className="rounded-lg max-w-full h-auto max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(mediaUrl, '_blank')}
                        data-testid={`media-image-${vask.id}-${index}`}
                      />
                    ) : mediaType === 'video' ? (
                      <video 
                        src={mediaUrl}
                        controls
                        className="rounded-lg max-w-full h-auto max-h-96 object-cover"
                        poster={mediaUrl}
                        data-testid={`media-video-${vask.id}-${index}`}
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center gap-2">
                          {mediaType === 'image' ? (
                            <Image className="h-5 w-5 text-blue-500" />
                          ) : mediaType === 'video' ? (
                            <Video className="h-5 w-5 text-red-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {mediaFilename}
                            </p>
                            {mediaSize > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(mediaSize)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(mediaUrl, '_blank')}
                          className="flex-shrink-0"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {vask.imageUrl && (
            <div className="mt-3">
              <img 
                src={vask.imageUrl} 
                alt="Vask image" 
                className="rounded-lg max-w-full h-auto max-h-96 object-cover"
                data-testid={`image-${vask.id}`}
              />
            </div>
          )}
          
          <div className="flex items-center space-x-6 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={cn(
                "engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200",
                vask.isLiked ? "liked text-red-500 hover:bg-red-50" : "hover:bg-accent"
              )}
              data-testid={`button-like-${vask.id}`}
            >
              <Heart 
                className={cn(
                  "h-5 w-5", 
                  vask.isLiked ? "fill-current" : ""
                )} 
              />
              <span className="text-sm font-medium" data-testid={`text-like-count-${vask.id}`}>
                {vask.likeCount}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200"
              data-testid={`button-comment-${vask.id}`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium" data-testid={`text-comment-count-${vask.id}`}>
                {vask.commentCount}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200"
              data-testid={`button-share-${vask.id}`}
            >
              <Share className="h-5 w-5" />
            </Button>

            {/* Delete button - only show for current user's vasks */}
            {vask.authorId === currentUser.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="engagement-button px-4 py-2 rounded-lg ml-auto hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                    data-testid={`button-delete-${vask.id}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border-red-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600">Delete Vask</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this vask? This action cannot be undone and will remove all associated likes and comments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover:bg-gray-100">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(vask.id)}
                      disabled={deleteMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {showComments && (
            <CommentSection vaskId={vask.id} currentUser={currentUser} />
          )}
        </div>
      </div>
    </article>
  );
}
