import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useEncryption } from "@/hooks/use-encryption";
import { decryptTextContent } from "@/lib/encryption";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, MoreHorizontal, UserPlus, UserMinus, Trash2, Dna, Zap, Clock, Layers, MessageCircle as MessageCircleIcon, Music, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CommentSection from "./comment-section";
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

interface RevolutionaryVaskCardProps {
  vask: VaskWithAuthor;
  currentUser: User;
}

// Helper function to detect revolutionary feature type from content
const detectRevolutionaryType = (content: string) => {
  if (content.includes('DNA Evolution') || content.includes('#DNAEvolution')) return 'dna';
  if (content.includes('Quantum Entanglement') || content.includes('#QuantumEntanglement')) return 'quantum';
  if (content.includes('Holographic') || content.includes('#Holographic')) return 'holographic';
  if (content.includes('Lightning Network') || content.includes('#LightningNetwork')) return 'lightning';
  if (content.includes('Sound Wave') || content.includes('#SoundWave')) return 'sound';
  return 'dna'; // default
};

// Revolutionary feature components
const DNAEvolutionCard = ({ content, author, createdAt }: { content: string, author: any, createdAt: string }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-pink-900/20 border border-purple-500/30 p-6">
    {/* Animated DNA Helix Background */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-4 left-4 w-8 h-8 border-2 border-purple-400 rounded-full animate-dna-helix"></div>
      <div className="absolute top-8 left-8 w-6 h-6 border-2 border-pink-400 rounded-full animate-dna-helix" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
      <div className="absolute top-12 left-12 w-4 h-4 border-2 border-purple-300 rounded-full animate-dna-helix" style={{ animationDuration: '3s' }}></div>
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Dna className="h-6 w-6 text-purple-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-200">DNA Evolution</h3>
          <p className="text-sm text-purple-300">Content genetic algorithm</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
            Generation 1
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
          <p className="text-purple-100 text-sm leading-relaxed">{content}</p>
        </div>
        
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-300">Virality: 50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300">Creativity: 60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-300">Blockchain: 70%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuantumEntanglementCard = ({ content, author, createdAt }: { content: string, author: any, createdAt: string }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900/20 via-cyan-800/10 to-indigo-900/20 border border-blue-500/30 p-6">
    {/* Animated Quantum Particles */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-6 left-6 w-2 h-2 bg-blue-400 rounded-full animate-quantum-pulse"></div>
      <div className="absolute top-12 right-8 w-1 h-1 bg-cyan-400 rounded-full animate-quantum-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-8 left-12 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-quantum-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-12 right-6 w-1 h-1 bg-blue-300 rounded-full animate-quantum-pulse" style={{ animationDelay: '1.5s' }}></div>
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Zap className="h-6 w-6 text-blue-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-200">Quantum Entanglement</h3>
          <p className="text-sm text-blue-300">Cross-chain content linking</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
            Entangled
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-black/20 rounded-lg p-4 border border-blue-500/20">
          <p className="text-blue-100 text-sm leading-relaxed">{content}</p>
        </div>
        
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300">Chain: Ethereum</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-300">Entangled: 2 posts</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HolographicCard = ({ content, author, createdAt }: { content: string, author: any, createdAt: string }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/20 via-purple-800/10 to-pink-900/20 border border-indigo-500/30 p-6">
    {/* Holographic Grid Effect */}
    <div className="absolute inset-0 opacity-10 animate-holographic-grid" style={{
      backgroundImage: `
        linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '20px 20px'
    }}></div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Layers className="h-6 w-6 text-indigo-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-200">Holographic Post</h3>
          <p className="text-sm text-indigo-300">Multi-dimensional content</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded-full">
            3D Layer
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-black/20 rounded-lg p-4 border border-indigo-500/20">
          <p className="text-indigo-100 text-sm leading-relaxed">{content}</p>
        </div>
        
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
            <span className="text-indigo-300">Dimensions: 3D</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-300">Holographic: Active</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);


const LightningNetworkCard = ({ content, author, createdAt }: { content: string, author: any, createdAt: string }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-900/20 via-emerald-800/10 to-teal-900/20 border border-green-500/30 p-6">
    {/* Lightning Effect */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-2 left-8 w-0.5 h-4 bg-green-400 animate-lightning"></div>
      <div className="absolute top-6 left-12 w-0.5 h-3 bg-emerald-400 animate-lightning" style={{ animationDelay: '0.2s' }}></div>
      <div className="absolute top-10 left-16 w-0.5 h-2 bg-teal-400 animate-lightning" style={{ animationDelay: '0.4s' }}></div>
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <MessageCircleIcon className="h-6 w-6 text-green-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-green-200">Lightning Network</h3>
          <p className="text-sm text-green-300">Instant communication</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
            Active
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-black/20 rounded-lg p-4 border border-green-500/20">
          <p className="text-green-100 text-sm leading-relaxed">{content}</p>
        </div>
        
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-300">Speed: Instant</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300">Channels: 3</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SoundWaveCard = ({ content, author, createdAt }: { content: string, author: any, createdAt: string }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-900/20 via-rose-800/10 to-purple-900/20 border border-pink-500/30 p-6">
    {/* Sound Wave Animation */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-8 left-4 w-1 h-8 bg-pink-400 rounded-full animate-sound-wave"></div>
      <div className="absolute top-6 left-8 w-1 h-12 bg-rose-400 rounded-full animate-sound-wave" style={{ animationDelay: '0.1s' }}></div>
      <div className="absolute top-10 left-12 w-1 h-6 bg-purple-400 rounded-full animate-sound-wave" style={{ animationDelay: '0.2s' }}></div>
      <div className="absolute top-4 left-16 w-1 h-10 bg-pink-300 rounded-full animate-sound-wave" style={{ animationDelay: '0.3s' }}></div>
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-500/20 rounded-lg">
          <Music className="h-6 w-6 text-pink-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-pink-200">Sound Wave</h3>
          <p className="text-sm text-pink-300">Audio content on blockchain</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-pink-400 bg-pink-500/20 px-2 py-1 rounded-full">
            Playing
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-black/20 rounded-lg p-4 border border-pink-500/20">
          <p className="text-pink-100 text-sm leading-relaxed">{content}</p>
        </div>
        
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
            <span className="text-pink-300">Frequency: 440Hz</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
            <span className="text-rose-300">Duration: 3.2s</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function RevolutionaryVaskCard({ vask, currentUser }: RevolutionaryVaskCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isFollowing, setIsFollowing] = useState(vask.author.isFollowing || false);
  const [, setLocation] = useLocation();
  const { decryptText, isDataEncrypted } = useEncryption();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync local isFollowing state with vask.author.isFollowing prop
  useEffect(() => {
    setIsFollowing(vask.author.isFollowing || false);
  }, [vask.author.isFollowing, vask.id, vask.authorId]);

  // Decrypt content if it's encrypted
  const displayContent = (() => {
    if (!vask.content) return null;
    
    // If content is encrypted and we have encrypted data, try to decrypt it
    if (vask.isEncrypted && vask.contentEncrypted && isDataEncrypted(vask.contentEncrypted)) {
      try {
        const decryptedContent = decryptTextContent(vask.contentEncrypted, vask.author.walletAddress);
        return decryptedContent;
      } catch (error) {
        console.error('❌ Failed to decrypt content:', error);
        return vask.content || '[Content could not be decrypted]';
      }
    }
    
    return vask.content;
  })();

  const revolutionaryType = detectRevolutionaryType(displayContent || '');

  const renderRevolutionaryCard = () => {
    const props = { content: displayContent || '', author: vask.author, createdAt: vask.createdAt };
    
    switch (revolutionaryType) {
      case 'dna':
        return <DNAEvolutionCard {...props} />;
      case 'quantum':
        return <QuantumEntanglementCard {...props} />;
      case 'holographic':
        return <HolographicCard {...props} />;
      case 'lightning':
        return <LightningNetworkCard {...props} />;
      case 'sound':
        return <SoundWaveCard {...props} />;
      default:
        return <DNAEvolutionCard {...props} />;
    }
  };

  // Like mutation
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

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async ({ authorId, isFollowing }: { authorId: string; isFollowing: boolean }) => {
      console.log('🔍 Revolutionary Follow Debug:', {
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
      console.log('📤 Revolutionary Sending request data:', requestData);
      
      if (isFollowing) {
        console.log('🗑️ Revolutionary Unfollowing user:', authorId);
        return await apiRequest('DELETE', `/api/users/${authorId}/follow`, requestData);
      } else {
        console.log('➕ Revolutionary Following user:', authorId);
        return await apiRequest('POST', `/api/users/${authorId}/follow`, requestData);
      }
    },
    onMutate: async ({ isFollowing }) => {
      console.log('🚀 Revolutionary Follow mutation onMutate:', { isFollowing, newState: !isFollowing });
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
      console.log('✅ Revolutionary Follow mutation onSuccess - invalidating queries');
      // Invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      // Also invalidate with user-specific keys
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/vasks', currentUser.id] });
      }
      toast({
        title: "Success",
        description: isFollowing ? "Unfollowed user" : "Following user",
      });
    },
    onError: (error, { isFollowing }) => {
      // Revert optimistic update on error
      setIsFollowing(isFollowing);
      console.error('Revolutionary Follow error:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
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
    setLocation(`/profile/${vask.author.uniqueId}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Vasukii Vask',
        text: displayContent || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Vask link copied to clipboard",
      });
    }
  };

  return (
    <article className="vask-card p-4 hover:bg-accent/50 transition-colors emotion-hover-serpent serpent-border" data-testid={`vask-card-${vask.id}`}>
      <div className="flex space-x-3">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden trishul-decoration animate-mystical-glow">
          {vask.author?.profileImage ? (
            <img 
              src={vask.author.profileImage} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-medium">
              {(vask.author?.displayName || vask.author?.ensName || vask.author?.walletAddress || "U")[0].toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <button 
                onClick={handleAuthorClick}
                className="font-medium hover:text-primary transition-colors cursor-pointer"
                data-testid={`text-author-${vask.id}`}
              >
                {vask.author?.ensName || vask.author?.displayName || "Anonymous"}
              </button>
              <span className="text-sm text-primary font-medium" data-testid={`text-unique-id-${vask.id}`}>
                @{vask.author?.uniqueId}
              </span>
              <span className="text-muted-foreground font-mono" data-testid={`text-address-${vask.id}`}>
                {vask.author?.walletAddress ? `${vask.author.walletAddress.slice(0, 6)}...${vask.author.walletAddress.slice(-4)}` : "unknown"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground" data-testid={`text-timestamp-${vask.id}`}>
                {new Date(vask.createdAt).toLocaleDateString()}
              </span>
              {vask.isPinned && (
                <span className="text-primary text-xs font-medium">📌 Pinned</span>
              )}
            </div>
            
            {/* Follow button - only show if not current user's post */}
            {vask.authorId !== currentUser.id && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollow}
                disabled={followMutation.isPending}
                className="ml-2 transition-all duration-200 hover:scale-105"
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="h-3 w-3 mr-1" />
                    {followMutation.isPending ? "Unfollowing..." : "Following"}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    {followMutation.isPending ? "Following..." : "Follow"}
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Revolutionary Feature Card */}
          {renderRevolutionaryCard()}
          
          {/* Engagement buttons */}
          <div className="flex items-center space-x-6 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={cn(
                "engagement-button flex items-center space-x-2 p-2 rounded-lg",
                vask.isLiked && "liked text-red-500"
              )}
              data-testid={`button-like-${vask.id}`}
            >
              <Heart 
                className={cn(
                  "text-lg", 
                  vask.isLiked ? "fill-current" : ""
                )} 
              />
              <span className="text-sm" data-testid={`text-like-count-${vask.id}`}>
                {vask.likeCount}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="engagement-button flex items-center space-x-2 p-2 rounded-lg"
              data-testid={`button-comment-${vask.id}`}
            >
              <MessageCircle className="text-lg" />
              <span className="text-sm" data-testid={`text-comment-count-${vask.id}`}>
                {vask.commentCount}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="engagement-button flex items-center space-x-2 p-2 rounded-lg"
              data-testid={`button-share-${vask.id}`}
            >
              <Share className="text-lg" />
            </Button>

            {/* Delete button - only show for current user's vasks */}
            {vask.authorId === currentUser.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="engagement-button p-2 rounded-lg ml-auto hover:bg-red-50 hover:text-red-600 transition-colors"
                    data-testid={`button-delete-${vask.id}`}
                  >
                    <Trash2 className="text-lg" />
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
