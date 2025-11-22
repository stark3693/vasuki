import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Moon, Sun, ArrowLeft, MessageCircle, Users, Lock, Globe, Search, ArrowRight, Bell, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { ChatInvitationNotification } from "@/components/chat-invitation-notification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  participants: number;
  maxParticipants: number;
  creator: {
    id: string;
    name: string;
    username: string;
    address: string;
  };
  createdAt: string;
  lastActivity: string;
  description?: string;
  isJoined: boolean;
}

export default function ChatRoomsPage() {
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const { toggleTheme, theme } = useTheme();
  const isMobile = useIsMobile();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [loading, setLoading] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInvitationBanner, setShowInvitationBanner] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  // Load pending invitations
  const loadPendingInvitations = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/chat-invitations/${user.id}`);
      if (response.ok) {
        const invitations = await response.json();
        const pending = invitations.filter((inv: any) => inv.status === 'pending');
        setPendingInvitations(pending);
        setShowInvitationBanner(pending.length > 0);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadPendingInvitations();
      // Check for new invitations every 5 seconds
      const interval = setInterval(loadPendingInvitations, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChatRooms();
  }, [searchQuery, filterType]);

  const loadChatRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        currentUserId: user?.id || '',
        ...(searchQuery && { search: searchQuery }),
        ...(filterType !== 'all' && { type: filterType })
      });

      const response = await fetch(`/api/chat-rooms?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }

      const chatRoomsData = await response.json();
      setChatRooms(chatRoomsData);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      // Fallback to empty array on error
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const joinChatRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to join chat room');
      }

      // Update local state
      setChatRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { ...room, isJoined: true, participants: room.participants + 1 }
          : room
      ));
      
      alert('🎉 Successfully joined the chat room!');
    } catch (error) {
      console.error('Failed to join chat room:', error);
      alert('❌ Failed to join chat room. Please try again.');
    }
  };

  const leaveChatRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave chat room');
      }

      // Update local state
      setChatRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { ...room, isJoined: false, participants: Math.max(0, room.participants - 1) }
          : room
      ));
      
      alert('👋 Left the chat room successfully!');
    } catch (error) {
      console.error('Failed to leave chat room:', error);
      alert('❌ Failed to leave chat room. Please try again.');
    }
  };

  const filteredRooms = chatRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!isConnected || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <MessageCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-xl text-green-800 dark:text-green-200">
              Lightning Chat Rooms
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Connect your wallet to access blockchain-secured chat rooms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <MessageCircle className="h-4 w-4" />
                <span>Join Lightning Chat Rooms</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Connect with others in instant, blockchain-secured group chats.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="premium"
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Connect Wallet to Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
          {/* Left Sidebar - Desktop */}
          {!isMobile && <Sidebar />}

          {/* Main Content */}
          <main className="flex-1 lg:border-r border-border min-w-0 max-w-full overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation('/home')}
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
        <img 
          src="/assets/finallogo.png" 
          alt="Vasukii Logo" 
          className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 logo-hover flex-shrink-0 rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text truncate" data-testid="page-title">
                    Lightning Chat Rooms
                  </h2>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  {/* Notification Badge */}
                  {pendingInvitations.length > 0 && (
                    <div className="relative">
                      <Bell className="h-5 w-5 text-blue-600 animate-pulse" />
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                      >
                        {pendingInvitations.length}
                      </Badge>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    data-testid="button-toggle-theme"
                    className="h-9 w-9 sm:h-10 sm:w-10"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                </div>
              </div>
            </header>

            {/* Chat Rooms Content */}
            <div className="p-4 sm:p-6">
              {/* Hero Section */}
              <div className="text-center space-y-4 mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full text-xs sm:text-sm font-medium text-primary">
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Blockchain-Secured Chat Rooms</span>
                  <span className="sm:hidden">Chat Rooms</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold gradient-text">
                  Lightning Chat Rooms
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                  Join instant, blockchain-secured group chat rooms. Connect with like-minded individuals 
                  in real-time conversations powered by Lightning Network technology.
                </p>
                <div className="mt-4 p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg mx-4">
                  <p className="text-xs sm:text-sm text-primary">
                    💡 <strong>Want to create a chat room?</strong> Go to <strong>Revolutionary Features → Lightning Chat</strong> to create your own Lightning-powered chat room!
                  </p>
                </div>
              </div>

              {/* Invitation Notifications Banner */}
              {showInvitationBanner && pendingInvitations.length > 0 && (
                <div className="mb-6">
                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                      🎉 You have {pendingInvitations.length} pending chat room invitation{pendingInvitations.length > 1 ? 's' : ''}!
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                      <div className="space-y-2">
                        {pendingInvitations.map((invitation, index) => (
                          <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <UserPlus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="text-xs sm:text-sm truncate">
                                Invited to <strong>"{invitation.roomName || 'Private Chat Room'}"</strong>
                                {invitation.inviterName && (
                                  <span> by <strong>{invitation.inviterName}</strong></span>
                                )}
                              </span>
                            </div>
                            <div className="flex gap-2 mobile-touch-target">
                              <Button
                                size="sm"
                                variant="premium"
                                onClick={() => {
                                  // Accept invitation
                                  fetch(`/api/chat-invitations/${invitation.invitationToken}/respond`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, response: 'accepted' })
                                  }).then(() => {
                                    loadPendingInvitations();
                                    alert('✅ Invitation accepted! You can now join the chat room.');
                                  });
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Decline invitation
                                  fetch(`/api/chat-invitations/${invitation.invitationToken}/respond`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, response: 'declined' })
                                  }).then(() => {
                                    loadPendingInvitations();
                                    alert('❌ Invitation declined.');
                                  });
                                }}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search chat rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('public')}
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    Public
                  </Button>
                  <Button
                    variant={filterType === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('private')}
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Private
                  </Button>
                </div>
              </div>

              {/* Chat Rooms Grid */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading chat rooms...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No chat rooms found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'No chat rooms available yet.'}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    💡 Chat rooms can only be created from the Lightning section in Revolutionary Features
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredRooms.map((room) => (
                    <Card key={room.id} className="premium-hover glass-card cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{room.name}</CardTitle>
                          </div>
                          <Badge variant={room.type === 'public' ? 'default' : 'secondary'}>
                            {room.type === 'public' ? (
                              <>
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </>
                            )}
                          </Badge>
                        </div>
                        <CardDescription>
                          {room.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{room.participants}/{room.maxParticipants}</span>
                          </div>
                          <span className="text-xs sm:text-sm">Last active: {room.lastActivity}</span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-xs text-muted-foreground truncate">
                            Created by: {room.creator.name || room.creator.username || room.creator.address.slice(0, 6) + '...' + room.creator.address.slice(-4)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(room.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={() => room.isJoined ? leaveChatRoom(room.id) : joinChatRoom(room.id)}
                            variant={room.isJoined ? "destructive" : "premium"}
                            className="w-full mobile-touch-target"
                          >
                            {room.isJoined ? 'Leave Room' : 'Join Room'}
                          </Button>
                          {room.isJoined && (
                            <Link href={`/chat-rooms/${room.id}`}>
                              <Button variant="glass" className="w-full mobile-touch-target">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Enter Chat
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
      
      {/* Chat Invitation Notifications */}
      {user && (
        <ChatInvitationNotification
          userId={user.id}
          className="fixed top-4 right-4 z-50 max-w-sm"
        />
      )}
    </>
  );
}
