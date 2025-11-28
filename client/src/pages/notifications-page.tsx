import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, ArrowLeft, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  actorId: string;
  vaskId?: string;
  commentId?: number;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    uniqueId: string;
    displayName: string;
    profileImage: string | null;
  };
  vask?: {
    id: string;
    content: string;
  };
}

export default function NotificationsPage() {
  const { user } = useWallet();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/notifications?userId=${user.id}&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return data.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('POST', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => 
          apiRequest('POST', `/api/notifications/${n.id}/read`)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "All notifications marked as read",
        description: "Your notifications have been cleared"
      });
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you in a post';
      default:
        return 'interacted with you';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.type === 'follow') {
      return `/u/${notification.actor.uniqueId}`;
    }
    return `/vask/${notification.vaskId}`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setLocation(getNotificationLink(notification));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="ml-auto"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground mb-6">
              When someone interacts with your content, you'll see it here
            </p>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              {/* Unread indicator */}
              {!notification.isRead && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}

              {/* Avatar */}
              <Avatar className="h-10 w-10 ring-2 ring-background">
                <img
                  src={notification.actor.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.actor.uniqueId}`}
                  alt={notification.actor.displayName}
                  className="object-cover"
                />
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  {/* Notification icon */}
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Notification text */}
                  <p className="text-sm flex-1">
                    <span className="font-semibold">
                      {notification.actor.displayName}
                    </span>
                    {' '}
                    <span className="text-muted-foreground">
                      {getNotificationText(notification)}
                    </span>
                  </p>
                </div>

                {/* Post preview (for likes/comments/mentions) */}
                {notification.vask && notification.type !== 'follow' && (
                  <p className="text-sm text-muted-foreground line-clamp-1 ml-6">
                    {notification.vask.content}
                  </p>
                )}

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
