import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Clock, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatInvitation {
  id: string;
  roomId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitationToken: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  respondedAt?: Date | string;
  roomName?: string;
  inviterName?: string;
}

interface ChatInvitationNotificationProps {
  userId: string;
  className?: string;
}

export function ChatInvitationNotification({ userId, className = '' }: ChatInvitationNotificationProps) {
  const [invitations, setInvitations] = useState<ChatInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadInvitations();
      
      // Poll for new invitations every 5 seconds
      const interval = setInterval(loadInvitations, 5000);
      
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/chat-invitations/${userId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if there are new invitations
        const previousCount = invitations.length;
        const newCount = data.length;
        
        if (newCount > previousCount && previousCount > 0) {
          const newInvitations = data.slice(0, newCount - previousCount);
          newInvitations.forEach((invitation: ChatInvitation) => {
            toast({
              title: "🎉 New Chat Invitation!",
              description: `You've been invited to join "${invitation.roomName || 'Private Chat Room'}"`,
              duration: 5000,
            });
          });
        }
        
        setInvitations(data);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (token: string, response: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/chat-invitations/${token}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          response,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: response === 'accepted' ? "✅ Invitation Accepted" : "❌ Invitation Declined",
          description: data.message,
        });
        
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.invitationToken !== token));
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to respond to invitation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      toast({
        title: "Error",
        description: "Failed to respond to invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  // Show a notification badge if there are pending invitations
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">Chat Invitation</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(invitation.createdAt)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <User className="h-3 w-3 inline mr-1" />
                {invitation.inviterName || 'Someone'} invited you to join "{invitation.roomName || 'Private Chat Room'}"
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respondToInvitation(invitation.invitationToken, 'accepted')}
                  className="flex-1"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToInvitation(invitation.invitationToken, 'declined')}
                  className="flex-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
