import React, { useState, useEffect } from 'react';
import { useSearch, useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Filter, TrendingUp, Clock, Users, Wallet, Shield, Gift, Star, Trophy, Zap, Target, BarChart3 } from 'lucide-react';
import { PollCreationForm } from '../components/prediction/poll-creation-form';
import { PollCard } from '../components/prediction/poll-card';
import { WalletGatedCreatePoll } from '../components/prediction/wallet-gated-interaction';
import { WalletRequiredGuard } from '../components/prediction/wallet-required-guard';
import { usePolls } from '../hooks/use-polls';
import { useWalletWeb3 } from '../hooks/use-wallet-web3';
import { useWallet } from '../hooks/use-wallet';
import { useIsMobile } from '../hooks/use-mobile';
import { PollStatus } from '../lib/web3-config';
import { ENV_CONFIG } from '../config/env';
import { toast } from '../hooks/use-toast';
import Sidebar from '../components/layout/sidebar';
import MobileNav from '../components/layout/mobile-nav';

export function PredictionPollsPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { polls, isLoadingPolls, refreshPolls, pollsError } = usePolls();
  const { isConnected: isWeb3Connected, userProfile } = useWalletWeb3();
  const { isConnected: isWalletConnected, walletAddress } = useWallet();
  const isMobile = useIsMobile();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PollStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'votes'>('newest');
  
  // Parse URL parameters to show specific poll
  const urlParams = new URLSearchParams(search);
  const specificPollId = urlParams.get('poll');


  // STRICT WALLET GATING: Only authenticated users can access this page
  if (!isWalletConnected || !walletAddress) {
    return <WalletRequiredGuard><div /></WalletRequiredGuard>;
  }

  // Filter and sort polls
  const filteredPolls = polls
    .filter(poll => {
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           poll.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || poll.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
        case 'oldest':
          return new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime();
        case 'votes':
          const aVotes = a.votes ? (Array.isArray(a.votes) ? a.votes.reduce((sum, vote) => sum + vote, 0) : Object.values(a.votes).reduce((sum, vote) => sum + vote, 0)) : 0;
          const bVotes = b.votes ? (Array.isArray(b.votes) ? b.votes.reduce((sum, vote) => sum + vote, 0) : Object.values(b.votes).reduce((sum, vote) => sum + vote, 0)) : 0;
          return bVotes - aVotes;
        default:
          return 0;
      }
    });

  const activePolls = filteredPolls.filter(poll => poll.status === PollStatus.ACTIVE);
  const closedPolls = filteredPolls.filter(poll => poll.status === PollStatus.CLOSED);
  const resolvedPolls = filteredPolls.filter(poll => poll.status === PollStatus.RESOLVED);

  const handleCreatePoll = () => {
    setShowCreateForm(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refreshPolls();
  };

  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  // Find specific poll if poll parameter is provided
  const specificPoll = specificPollId ? polls.find(poll => poll.id.toString() === specificPollId) : null;

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
          {/* Left Sidebar - Desktop */}
          {!isMobile && <Sidebar />}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="container mx-auto px-4 py-8">
              <PollCreationForm
                onSuccess={handleCreateSuccess}
                onCancel={handleCreateCancel}
              />
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav />}
      </div>
    );
  }

  // Show specific poll if requested
  if (specificPollId) {
    if (isLoadingPolls) {
      return (
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
            {/* Left Sidebar - Desktop */}
            {!isMobile && <Sidebar />}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading poll...</p>
                </div>
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && <MobileNav />}
        </div>
      );
    }
    
    if (specificPoll) {
      return (
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
            {/* Left Sidebar - Desktop */}
            {!isMobile && <Sidebar />}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/prediction-polls')}
                    className="mb-4"
                  >
                    ← Back to All Polls
                  </Button>
                  <h1 className="text-3xl font-bold mb-2">Poll Details</h1>
                  <p className="text-muted-foreground">Viewing specific poll: {specificPoll.title}</p>
                </div>
                
                <div className="grid gap-6">
                  <PollCard
                    key={specificPoll.id}
                    poll={specificPoll}
                    onVote={refreshPolls}
                  />
                </div>
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && <MobileNav />}
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
            {/* Left Sidebar - Desktop */}
            {!isMobile && <Sidebar />}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">Poll Not Found</h1>
                  <p className="text-muted-foreground mb-6">
                    The poll you're looking for doesn't exist or has been removed.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/prediction-polls')}
                  >
                    ← Back to All Polls
                  </Button>
                </div>
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && <MobileNav />}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
            {/* Enhanced Header */}
            <div className="mb-8 lg:mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-6">
          <div className="space-y-3 lg:space-y-4">
          <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text">
                <span className="hidden sm:inline">Decentralized Prediction Market</span>
                <span className="sm:hidden">Prediction Market</span>
              </h1>
              <p className="text-muted-foreground mt-3 text-base sm:text-lg lg:text-xl max-w-2xl">
                <span className="hidden sm:inline">Create polls and predict the future. Secure blockchain-backed predictions with rewards.</span>
                <span className="sm:hidden">Create polls and predict the future.</span>
              </p>
            </div>

            {/* Enhanced Wallet & Token Status */}
            {walletAddress && (
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Wallet Address */}
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500 hidden sm:inline">
                    Secure Access
                  </span>
                  <span className="text-sm sm:hidden">Secure</span>
                </div>
              </div>
            )}

          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <WalletGatedCreatePoll>
              <Button onClick={handleCreatePoll} className="btn-primary px-6 py-3 h-12 text-base flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Create Poll</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </WalletGatedCreatePoll>
          </div>
        </div>

        {/* Enhanced Market Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Total Polls */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Total Polls</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">{polls.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Polls */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Clock className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Active Polls</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-500">{activePolls.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Votes */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Users className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Total Votes</span>
                  </div>
                  <div className="text-3xl font-bold text-secondary">
                    {polls.reduce((sum, poll) => {
                      if (poll.votes && typeof poll.votes === 'object') {
                            return sum + Object.values(poll.votes as Record<string, number>).reduce((v: number, vote: number) => v + vote, 0);
                      } else if (Array.isArray(poll.votes)) {
                            return sum + (poll.votes as number[]).reduce((v: number, vote: number) => v + vote, 0);
                      }
                      return sum;
                    }, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Enhanced User Activity Summary */}
        {walletAddress && (
          <Card className="mb-8 card-elevated border-dashed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Your Activity Summary</h3>
                    <p className="text-muted-foreground">
                      Track your participation in the prediction market
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Start Guide */}
        {polls.length === 0 && (
          <Card className="mb-6 border-dashed border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Welcome to the Prediction Market!
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 mb-4">
                    Be the first to create a prediction poll and start the decentralized prediction market.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <WalletGatedCreatePoll>
                      <Button variant="premium">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Poll
                      </Button>
                    </WalletGatedCreatePoll>
                    <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900">
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Filters */}
        <Card className="mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Browse Prediction Polls</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Search, filter, and sort through all available prediction polls
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search polls by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PollStatus | 'all')}>
                  <SelectTrigger className="w-full sm:w-40 h-10 sm:h-11">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value={PollStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={PollStatus.CLOSED}>Closed</SelectItem>
                    <SelectItem value={PollStatus.RESOLVED}>Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-full sm:w-44 h-10 sm:h-11">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="votes">Most Votes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Polls Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <TabsList className="grid w-full sm:max-w-lg grid-cols-4 h-auto">
          <TabsTrigger value="active" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Active</span>
              <Badge variant="secondary" className="ml-0 sm:ml-1 text-xs">
                {activePolls.length}
              </Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Closed</span>
              <Badge variant="secondary" className="ml-0 sm:ml-1 text-xs">
                {closedPolls.length}
              </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Resolved</span>
              <Badge variant="secondary" className="ml-0 sm:ml-1 text-xs">
                {resolvedPolls.length}
              </Badge>
          </TabsTrigger>
        </TabsList>
          
          {/* Results Summary */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{activePolls.length} Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{closedPolls.length} Closed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{resolvedPolls.length} Resolved</span>
            </div>
          </div>
        </div>

        <TabsContent value="active" className="mt-6">
          {pollsError ? (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-red-100 dark:bg-red-900 rounded-full w-fit mx-auto">
                    <Shield className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">Failed to Load Polls</h3>
                    <p className="text-red-600 dark:text-red-400 mb-6">
                      {pollsError instanceof Error ? pollsError.message : 'An error occurred while loading polls'}
                    </p>
                    <Button onClick={() => refreshPolls()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isLoadingPolls ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading active polls...</p>
            </div>
          ) : activePolls.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full w-fit mx-auto">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No Active Polls</h3>
                    <p className="text-muted-foreground mb-6">
                      There are no active prediction polls at the moment. Create one to get started!
                    </p>
                    <WalletGatedCreatePoll>
                      <Button onClick={handleCreatePoll} variant="premium">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Poll
                    </Button>
                    </WalletGatedCreatePoll>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {activePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={refreshPolls}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {closedPolls.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-full w-fit mx-auto">
                    <Users className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No Closed Polls</h3>
                  <p className="text-muted-foreground">
                      There are no polls waiting for resolution at the moment.
                  </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {closedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onResolve={refreshPolls}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          {resolvedPolls.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto">
                    <Trophy className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No Resolved Polls</h3>
                  <p className="text-muted-foreground">
                      No polls have been resolved yet. Winners will appear here once polls are resolved.
                  </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {resolvedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                />
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
