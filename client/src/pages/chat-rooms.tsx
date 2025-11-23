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
      <div className="min-h-screen bg-background responsive-container responsive-spacing">
        <div className="responsive-flex">
          {/* Left Sidebar - Desktop */}
          {!isMobile && <Sidebar />}

          {/* Main Content */}
          <main className="flex-1 lg:border-r border-border min-w-0 max-w-full overflow-hidden responsive-spacing">
            {/* Header */}
            <header className="sticky top-0 bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl border-b-2 border-primary/20 shadow-lg responsive-padding z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation('/home')}
                    className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-primary/10 hover:scale-110 transition-all duration-300 rounded-xl"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img 
                      src="/assets/finallogo.png" 
                      alt="Vasukii Logo" 
                      className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent truncate" data-testid="page-title">
                        Lightning Chat Rooms
                      </h2>
                      <p className="text-xs text-muted-foreground hidden sm:block">Connect & Collaborate</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Notification Badge */}
                  {pendingInvitations.length > 0 && (
                    <div className="relative animate-bounce">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md" />
                      <Bell className="relative h-5 w-5 text-blue-600 animate-pulse" />
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs font-bold shadow-lg animate-pulse"
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
                    className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-primary/10 hover:rotate-180 transition-all duration-500 rounded-xl"
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </header>

            {/* Chat Rooms Content */}
            <div className="responsive-padding">
              {/* Hero Section */}
              <div className="relative text-center space-y-6 mb-8 py-8">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl blur-3xl -z-10" />
                
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-primary/20 via-primary/15 to-secondary/20 rounded-full text-sm font-semibold shadow-lg border border-primary/30 hover:scale-105 transition-transform duration-300">
                  <MessageCircle className="h-4 w-4 animate-pulse" />
                  <span className="hidden sm:inline bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Blockchain-Secured Chat Rooms</span>
                  <span className="sm:hidden bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Chat Rooms</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent leading-tight">
                  Lightning Chat Rooms
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
                  Join <span className="text-primary font-semibold">instant</span>, blockchain-secured group chat rooms. Connect with like-minded individuals in <span className="text-secondary font-semibold">real-time</span> conversations powered by Lightning Network technology.
                </p>
                
                <div className="relative max-w-2xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-xl" />
                  <div className="relative p-4 sm:p-5 bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-2 border-primary/30 rounded-xl shadow-xl backdrop-blur-sm mx-4">
                    <p className="text-sm sm:text-base text-foreground font-medium">
                      💡 <strong className="text-primary">Want to create a chat room?</strong> Go to <strong className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Revolutionary Features → Lightning Chat</strong> to create your own Lightning-powered chat room!
                    </p>
                  </div>
                </div>
              </div>

              {/* Invitation Notifications Banner */}
              {showInvitationBanner && pendingInvitations.length > 0 && (
                <div className="mb-8">
                  <Alert className="border-2 border-blue-500/50 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-100/50 dark:from-blue-950 dark:via-blue-950/80 dark:to-blue-900/50 shadow-xl rounded-xl">
                    <Bell className="h-5 w-5 text-blue-600 animate-pulse" />
                    <AlertTitle className="text-blue-900 dark:text-blue-100 font-bold text-lg">
                      🎉 You have {pendingInvitations.length} pending chat room invitation{pendingInvitations.length > 1 ? 's' : ''}!
                    </AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
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
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search chat rooms by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-11 border-2 focus:border-primary/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-300"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="default"
                    onClick={() => setFilterType('all')}
                    className={`rounded-xl font-semibold transition-all duration-300 ${
                      filterType === 'all' 
                        ? 'bg-gradient-to-r from-primary to-primary/90 shadow-lg' 
                        : 'hover:bg-primary/10 hover:border-primary/50'
                    }`}
                  >
                    All Rooms
                  </Button>
                  <Button
                    variant={filterType === 'public' ? 'default' : 'outline'}
                    size="default"
                    onClick={() => setFilterType('public')}
                    className={`rounded-xl font-semibold transition-all duration-300 ${
                      filterType === 'public' 
                        ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-lg' 
                        : 'hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-500/50'
                    }`}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Public
                  </Button>
                  <Button
                    variant={filterType === 'private' ? 'default' : 'outline'}
                    size="default"
                    onClick={() => setFilterType('private')}
                    className={`rounded-xl font-semibold transition-all duration-300 ${
                      filterType === 'private' 
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-lg' 
                        : 'hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-500/50'
                    }`}
                  >
                    <Lock className="h-4 w-4 mr-2" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRooms.map((room) => (
                    <Card key={room.id} className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 bg-gradient-to-br from-card via-card to-card/80">
                      {/* Animated background gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <CardHeader className="relative space-y-3 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
                              <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">{room.name}</CardTitle>
                          </div>
                          <Badge 
                            variant={room.type === 'public' ? 'default' : 'secondary'}
                            className="flex-shrink-0 px-2.5 py-1 font-semibold shadow-sm"
                          >
                            {room.type === 'public' ? (
                              <>
                                <Globe className="h-3.5 w-3.5 mr-1.5" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 mr-1.5" />
                                Private
                              </>
                            )}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                          {room.description || 'No description available'}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="relative space-y-4">
                        {/* Participants and Activity */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{room.participants}/{room.maxParticipants}</div>
                              <div className="text-xs text-muted-foreground">Members</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">Last active</div>
                            <div className="text-xs text-muted-foreground">{room.lastActivity}</div>
                          </div>
                        </div>
                        
                        {/* Creator Info */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="truncate">{room.creator.name || room.creator.username || room.creator.address.slice(0, 6) + '...' + room.creator.address.slice(-4)}</span>
                          </div>
                          <div className="text-muted-foreground flex-shrink-0">
                            {new Date(room.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                          {room.isJoined ? (
                            <>
                              <Link href={`/chat-rooms/${room.id}`}>
                                <Button className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 group/btn">
                                  <MessageCircle className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                                  Enter Chat
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                              </Link>
                              <Button
                                onClick={() => leaveChatRoom(room.id)}
                                variant="outline"
                                size="sm"
                                className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                              >
                                Leave Room
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => joinChatRoom(room.id)}
                              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-md hover:shadow-lg transition-all duration-300"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Join Room
                            </Button>
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
