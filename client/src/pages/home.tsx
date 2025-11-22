import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import ComposeVask from "@/components/vask/compose-vask";
import VaskCard from "@/components/vask/vask-card";
import PollFeedCard from "@/components/vask/poll-feed-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Target, MessageSquare, Wallet, Coins } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { usePolls } from "@/hooks/use-polls";
import { useUserSuggestions } from "@/hooks/use-user-suggestions";
import { UserSuggestions } from "@/components/ui/user-suggestions";
import { ChatInvitationNotification } from "@/components/chat-invitation-notification";

import type { VaskWithAuthor } from "@shared/schema";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const { toggleTheme, theme } = useTheme();
  const isMobile = useIsMobile();
  const [showMobileCompose, setShowMobileCompose] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'vasks' | 'polls'>('all');

  const { data: vasks, isLoading: isLoadingVasks } = useQuery<VaskWithAuthor[]>({
    queryKey: ["/api/vasks", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/vasks?currentUserId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch vasks');
      return response.json();
    },
    enabled: isConnected,
  });

  const { polls, isLoadingPolls } = usePolls();
  const { data: userSuggestions, isLoading: isLoadingSuggestions, refetch: refetchSuggestions } = useUserSuggestions(user?.id, 5);

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  if (!isConnected || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-xl text-blue-800 dark:text-blue-200">
              Welcome to Vasukii Prediction Polls
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Connect your wallet to participate in prediction polls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Target className="h-4 w-4" />
                <span>Create and Vote on Polls</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Connect your wallet to start voting on prediction polls.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet to Get Started
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  No wallet? Install MetaMask or use WalletConnect
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 lg:border-r border-border min-w-0 max-w-full overflow-hidden">
          {/* Enhanced Header */}
          <header className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 sm:p-6 z-10 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <img 
                src="/assets/finallogo.png" 
                alt="Vasukii Logo" 
                className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 logo-hover flex-shrink-0 rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text truncate" data-testid="page-title">
                    Home
                  </h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Discover and participate in prediction markets
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  data-testid="button-toggle-theme"
                  className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-accent transition-colors duration-200"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </header>

          {/* Compose Vask - Desktop */}
          {!isMobile && (
            <div className="border-b border-border/50 p-6 bg-card/30">
              <ComposeVask />
            </div>
          )}

          {/* Enhanced Feed Tabs */}
          <div className="border-b border-border/50 overflow-x-auto bg-card/20">
            <div className="flex space-x-0 min-w-max px-4 sm:px-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === 'all'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden xs:inline">All Posts</span>
                <span className="xs:hidden">All</span>
              </button>
              <button
                onClick={() => setActiveTab('vasks')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === 'vasks'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Vasks</span>
              </button>
              <button
                onClick={() => setActiveTab('polls')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === 'polls'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Prediction Polls</span>
                <span className="sm:hidden">Polls</span>
              </button>
            </div>
          </div>

          {/* Enhanced Feed */}
          <div className="divide-y divide-border/50">
            {(isLoadingVasks || isLoadingPolls) ? (
              <div className="space-y-6 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-4 p-6 bg-card/30 rounded-lg border border-border/50">
                    <div className="flex space-x-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex space-x-4">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Combined Feed - Newest First */}
                {activeTab === 'all' && (
                  <>
                    {(() => {
                      // Combine vasks and polls into a unified feed
                      const combinedFeed: Array<{type: 'vask' | 'poll', data: any, createdAt: Date}> = [];
                      
                      // Add vasks to combined feed
                      if (vasks && vasks.length > 0) {
                        vasks.forEach(vask => {
                          combinedFeed.push({
                            type: 'vask',
                            data: vask,
                            createdAt: vask.createdAt
                          });
                        });
                      }
                      
                      // Add polls to combined feed
                      if (polls && polls.length > 0) {
                        polls.forEach(poll => {
                          combinedFeed.push({
                            type: 'poll',
                            data: poll,
                            createdAt: poll.createdAt
                          });
                        });
                      }
                      
                      // Sort by creation time (newest first)
                      combinedFeed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      
                      // Render the unified feed
                      if (combinedFeed.length > 0) {
                        return combinedFeed.map((item, index) => {
                          // Create a unique key that includes both type and index to prevent duplicate key issues
                          const uniqueKey = `${item.type}-${item.data.id}-${index}`;
                          
                          if (item.type === 'vask') {
                            return <VaskCard key={uniqueKey} vask={item.data} currentUser={user} />;
                          } else {
                            return <PollFeedCard key={uniqueKey} poll={item.data} currentUser={user} />;
                          }
                        });
                      } else {
                        // Enhanced empty state
                        return (
                          <div className="p-12 text-center">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6">
                              <MessageSquare className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Welcome to Vasukii!</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                              Be the first to share a vask or create a prediction poll to start the conversation!
                            </p>
                            <div className="flex gap-4 justify-center">
                              <Button 
                                onClick={() => setLocation('/prediction-polls')}
                                className="btn-primary"
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Create Poll
                              </Button>
                              <Button 
                                onClick={() => setActiveTab('vasks')}
                                variant="outline"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Vasks
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </>
                )}

                {/* Vasks Only */}
                {activeTab === 'vasks' && (
                  vasks && vasks.length > 0 ? (
                    vasks.map((vask, index) => (
                      <VaskCard key={`vask-${vask.id}-${index}`} vask={vask} currentUser={user} />
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No vasks yet. Be the first to post something!</p>
                    </div>
                  )
                )}

                {/* Polls Only */}
                {activeTab === 'polls' && (
                  <div className="space-y-4">
                    {polls && polls.length > 0 ? (
                      polls.map((poll, index) => (
                        <PollFeedCard key={`poll-${poll.id}-${index}`} poll={poll} currentUser={user} />
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium mb-2">No prediction polls yet</p>
                        <p className="text-sm mb-4">Be the first to create a prediction poll and start the community discussion!</p>
                        <Button 
                          onClick={() => setLocation('/prediction-polls')}
                          className="mt-4"
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Create First Poll
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </main>

        {/* Enhanced Right Sidebar - Desktop */}
        {!isMobile && (
          <aside className="hidden xl:block w-80 p-6 space-y-6 flex-shrink-0 max-w-sm">
            {/* Enhanced Poll Statistics */}
            <Card className="card-elevated">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  Prediction Market
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                  <div className="text-3xl font-bold text-primary mb-2">{polls?.length || 0}</div>
                  <div className="text-sm text-muted-foreground font-medium">Active Polls</div>
                </div>
                <Button 
                  onClick={() => setLocation('/prediction-polls')}
                  className="w-full btn-primary"
                >
                  <Target className="h-4 w-4 mr-2" />
                  View All Polls
                </Button>
              </CardContent>
            </Card>


            {/* User Suggestions */}
            {userSuggestions && userSuggestions.length > 0 && (
              <UserSuggestions 
                suggestions={userSuggestions} 
                currentUserId={user.id} 
                onRefresh={refetchSuggestions}
              />
            )}


          </aside>
        )}
      </div>

      {/* Enhanced Floating Compose Button - Mobile */}
      {isMobile && (
        <Button
          onClick={() => setShowMobileCompose(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 z-50"
          data-testid="button-compose-mobile"
          aria-label="Compose new vask"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Compose Dialog */}
      <Dialog open={showMobileCompose} onOpenChange={setShowMobileCompose}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Compose Vask</DialogTitle>
            <DialogDescription>
              Share your thoughts on the decentralized web
            </DialogDescription>
          </DialogHeader>
          <ComposeVask onPosted={() => setShowMobileCompose(false)} />
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
      
      {/* Chat Invitation Notifications */}
      {user && (
        <ChatInvitationNotification
          userId={user.id}
          className="fixed top-4 right-4 z-50 max-w-sm"
        />
      )}
      </div>
    </>
  );
}
