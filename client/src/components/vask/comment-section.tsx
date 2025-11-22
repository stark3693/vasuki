import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEncryption } from "@/hooks/use-encryption";
import { decryptTextContent } from "@/lib/encryption";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import type { CommentWithAuthor, User } from "@shared/schema";

interface CommentSectionProps {
  vaskId: string;
  currentUser: User;
}

export default function CommentSection({ vaskId, currentUser }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const { encryptText, decryptText, isDataEncrypted, isEncryptionAvailable } = useEncryption();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/vasks", vaskId, "comments"],
    queryFn: () => apiRequest('GET', `/api/vasks/${vaskId}/comments`).then(res => res.json()),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { 
      content: string; 
      contentEncrypted?: any;
      authorId: string; 
      isEncrypted?: boolean;
    }) => {
      const response = await apiRequest('POST', `/api/vasks/${vaskId}/comments`, commentData);
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/vasks", vaskId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vasks"] });
    },
    onError: () => {
      toast({
        title: "Comment Failed",
        description: "Failed to post your comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest('DELETE', `/api/comments/${commentId}`, { userId: currentUser.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vasks", vaskId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vasks"] });
      toast({
        title: "Comment Deleted",
        description: "Your comment has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const commentData: any = {
      authorId: currentUser.id,
      isEncrypted: isEncryptionAvailable,
    };

    if (isEncryptionAvailable) {
      // Encrypt the comment content
      const encryptedContent = encryptText(newComment.trim());
      commentData.contentEncrypted = encryptedContent;
      commentData.content = newComment.trim(); // Keep original content for validation
    } else {
      commentData.content = newComment.trim();
    }

    createCommentMutation.mutate(commentData);
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
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

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4" data-testid={`comment-section-${vaskId}`}>
      {/* Comment Input */}
      <div className="flex space-x-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-medium">
            {(currentUser.displayName || currentUser.ensName || currentUser.walletAddress)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none min-h-[80px]"
            maxLength={280}
            data-testid={`textarea-comment-${vaskId}`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {newComment.length}/280
            </span>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
              className="wallet-button"
              data-testid={`button-post-comment-${vaskId}`}
            >
              <Send className="h-4 w-4 mr-2" />
              {createCommentMutation.isPending ? "Posting..." : "Comment"}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((comment, index) => (
            <div 
              key={`comment-${comment.id}-${index}`} 
              className="flex space-x-3 p-3 rounded-lg bg-muted/30"
              data-testid={`comment-${comment.id}`}
            >
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {(comment.author?.displayName || comment.author?.ensName || comment.author?.walletAddress || "U")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-sm mb-1">
                  <span className="font-medium" data-testid={`comment-author-${comment.id}`}>
                    {comment.author?.ensName || comment.author?.displayName || "Anonymous"}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {comment.author?.walletAddress ? `${comment.author.walletAddress.slice(0, 6)}...${comment.author.walletAddress.slice(-4)}` : "unknown"}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground" data-testid={`comment-time-${comment.id}`}>
                    {formatTimeAgo(new Date(comment.createdAt))}
                  </span>
                  {comment.authorId === currentUser.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="ml-auto p-1 h-auto text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-comment-${comment.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground" data-testid={`comment-content-${comment.id}`}>
                  {(() => {
                    console.log('🔍 Comment Debug:', {
                      id: comment.id,
                      content: comment.content,
                      contentEncrypted: comment.contentEncrypted,
                      isEncrypted: comment.isEncrypted,
                      authorWalletAddress: comment.author?.walletAddress
                    });
                    
                    // If content is encrypted and we have encrypted data, try to decrypt it
                    if (comment.isEncrypted && comment.contentEncrypted && isDataEncrypted(comment.contentEncrypted)) {
                      try {
                        console.log('🔓 Attempting to decrypt comment...');
                        const decryptedContent = decryptTextContent(comment.contentEncrypted, comment.author?.walletAddress || '');
                        console.log('✅ Comment decryption successful:', decryptedContent);
                        return decryptedContent;
                      } catch (error) {
                        console.error('❌ Failed to decrypt comment:', error);
                        // Fall back to regular content if decryption fails
                        return comment.content || '[Comment could not be decrypted]';
                      }
                    }
                    
                    // Use regular content if not encrypted or if decryption failed
                    console.log('📝 Using regular comment content:', comment.content);
                    return comment.content || '';
                  })()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}
