import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, 
  Clock, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Heart, 
  MessageCircle, 
  Share,
  Zap
} from 'lucide-react';
import { Poll, PollStatus, ServerPoll } from '@/lib/web3-config';

// Type guard to check if poll is ServerPoll
function isServerPoll(poll: Poll | ServerPoll): poll is ServerPoll {
  return typeof poll.id === 'string';
}

// Convert ServerPoll to Poll format for components that expect Poll type
function convertToPoll(poll: Poll | ServerPoll): Poll {
  if (isServerPoll(poll)) {
    return {
      ...poll,
      id: poll.id as any, // Keep the original UUID string - cast to any to handle type mismatch
      creator: poll.creator.walletAddress,
      deadline: Math.floor(new Date(poll.deadline).getTime() / 1000),
      status: poll.status as any,
      options: Array.isArray(poll.options) ? poll.options : []
    };
  }
  return {
    ...poll,
    options: Array.isArray(poll.options) ? poll.options : []
  };
}
import { useWalletWeb3 } from '@/hooks/use-wallet-web3';
import { usePolls } from '@/hooks/use-polls';
import { formatDistanceToNow } from 'date-fns';
import { PollVotingModal } from '../prediction/poll-voting-modal';
import { PollResultsModal } from '../prediction/poll-results-modal';
import { WalletGatedInteraction } from '../prediction/wallet-gated-interaction';
import { RewardStatus } from '../prediction/reward-claiming';

interface PollFeedCardProps {
  poll: Poll | ServerPoll;
  currentUser: any;
  onVote?: () => void;
}

export default function PollFeedCard({ poll, currentUser, onVote }: PollFeedCardProps) {
  const [, setLocation] = useLocation();
  const { address, isConnected } = useWalletWeb3();
  const { hasUserVoted, getUserVote, getPollVotes, refreshPolls } = usePolls();
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [userVoted, setUserVoted] = useState(false);
  const [userVoteData, setUserVoteData] = useState<{ option: number; stakeAmount: string; timestamp: number } | null>(null);
  const [votes, setVotes] = useState<number[]>([]);

  // Ensure poll has proper structure with array options
  const safePoll = React.useMemo(() => {
    const convertedPoll = isServerPoll(poll) ? convertToPoll(poll) : poll;
    return {
      ...convertedPoll,
      options: Array.isArray(convertedPoll.options) ? convertedPoll.options : []
    };
  }, [poll]);

  // Load poll data
  React.useEffect(() => {
    const loadPollData = async () => {
      if (address) {
        if (isServerPoll(safePoll)) {
          // For server polls, use the data directly from the poll object
          const votesArray = Array.isArray(safePoll.votes) ? safePoll.votes : Object.values(safePoll.votes || {});
          
          setVotes(votesArray.map(v => Number(v) || 0));
          setUserVoted(!!(safePoll as any).userVote);
          setUserVoteData((safePoll as any).userVote || null);
        } else {
          // For blockchain polls, use the old method
          const pollId = safePoll.id.toString();
          const voted = await hasUserVoted(pollId, address);
          const voteData = await getUserVote(pollId, address);
          const pollVotes = await getPollVotes(pollId);
          
          setUserVoted(voted.data || false);
          setUserVoteData(voteData.data);
          setVotes(Array.isArray(pollVotes.data) ? pollVotes.data : []);
        }
      }
    };
    
    loadPollData();
  }, [safePoll.id, address, safePoll.votes, (safePoll as any).userVote]);

  const now = Math.floor(Date.now() / 1000);
  
  // Handle deadline conversion properly for both server and blockchain polls
  let deadline: number;
  if (isServerPoll(safePoll)) {
    // For server polls, deadline is stored as a Date object or ISO string
    let deadlineDate: Date;
    if ((safePoll.deadline as any) instanceof Date) {
      deadlineDate = safePoll.deadline as Date;
    } else if (typeof safePoll.deadline === 'string') {
      deadlineDate = new Date(safePoll.deadline);
    } else {
      // Fallback: assume it's a timestamp
      deadlineDate = new Date(safePoll.deadline);
    }
    
    // Ensure the date is valid
    if (isNaN(deadlineDate.getTime())) {
      console.error('Invalid deadline date for poll:', safePoll.id, safePoll.deadline);
      deadline = now + 86400; // Default to 24 hours from now if invalid
    } else {
      deadline = Math.floor(deadlineDate.getTime() / 1000);
    }
  } else {
    // For blockchain polls, deadline is already a Unix timestamp
    deadline = safePoll.deadline;
  }
  
  // Use server-calculated status if available, otherwise calculate locally
  const serverStatus = isServerPoll(safePoll) ? safePoll.status : null;
  const isExpired = now >= deadline;
  const isActive = serverStatus === 'active' || (!serverStatus && !isExpired && !safePoll.isResolved);
  const isClosed = serverStatus === 'closed' || (!serverStatus && isExpired && !safePoll.isResolved);
  const isResolved = serverStatus === 'resolved' || (!serverStatus && safePoll.isResolved);

  const getStatus = (): PollStatus => {
    if (isResolved) return PollStatus.RESOLVED;
    if (isClosed) return PollStatus.CLOSED;
    return PollStatus.ACTIVE;
  };

  const getStatusBadge = () => {
    const status = getStatus();
    switch (status) {
      case PollStatus.ACTIVE:
        return <Badge variant="default" className="bg-green-500 text-white">Active</Badge>;
      case PollStatus.CLOSED:
        return <Badge variant="secondary">Closed</Badge>;
      case PollStatus.RESOLVED:
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Resolved</Badge>;
      default:
        return null;
    }
  };

  const getTimeRemaining = () => {
    if (isExpired) return 'Expired';
    
    try {
      // Use the already calculated deadline timestamp
      const deadlineDate = new Date(deadline * 1000);
      
      // Check if the date is valid
      if (isNaN(deadlineDate.getTime())) {
        console.warn('Invalid deadline date for time remaining:', deadline);
        return 'Unknown';
      }
      
      return formatDistanceToNow(deadlineDate, { addSuffix: true });
    } catch (error) {
      console.warn('Error formatting deadline:', error);
      return 'Unknown';
    }
  };

  const getTotalVotes = () => {
    if (!votes || votes.length === 0) return 0;
    return votes.reduce((sum: number, vote: number) => sum + Number(vote), 0);
  };


  const getVotePercentage = (optionIndex: number) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = Number(votes[optionIndex]) || 0;
    return (optionVotes / totalVotes) * 100;
  };

  const canVote = isConnected && isActive && !userVoted;
  const canViewResults = true; // Allow viewing results for all polls

  const formatTimeAgo = (dateOrTimestamp: Date | number) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = dateOrTimestamp instanceof Date ? Math.floor(dateOrTimestamp.getTime() / 1000) : dateOrTimestamp;
      
      // Check if timestamp is valid
      if (isNaN(timestamp) || timestamp <= 0) {
        console.warn('Invalid timestamp for formatTimeAgo:', dateOrTimestamp);
        return "unknown";
      }
      
      const diffInMinutes = Math.floor((now - timestamp) / 60);
      
      if (diffInMinutes < 1) return "now";
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return `${Math.floor(diffInMinutes / 1440)}d`;
    } catch (error) {
      console.warn('Error in formatTimeAgo:', error);
      return "unknown";
    }
  };

  const handlePollClick = () => {
    setLocation(`/prediction-polls?poll=${safePoll.id}`);
  };

  return (
    <>
      <article className="vask-card p-4 sm:p-6 hover:bg-accent/30 transition-all duration-200 border-l-4 border-l-primary/60" data-testid={`poll-card-${safePoll.id}`}>
        <div className="flex space-x-3 sm:space-x-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Target className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Enhanced Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-sm">
                <button 
                  onClick={handlePollClick}
                  className="font-semibold hover:text-primary transition-colors cursor-pointer text-left text-base"
                >
                  <span className="hidden sm:inline">Prediction Poll</span>
                  <span className="sm:hidden">Poll</span>
                </button>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded-md text-xs">
                    @poll-{safePoll.id}
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">·</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {typeof safePoll.creator === 'string' 
                      ? `${safePoll.creator.slice(0, 4)}...${safePoll.creator.slice(-4)}`
                      : ((safePoll.creator as any).displayName || (safePoll.creator as any).uniqueId || 'Unknown').slice(0, 10)
                    }
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatTimeAgo(new Date(deadline * 1000))}
                </span>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {getStatusBadge()}
                <RewardStatus poll={safePoll} userVote={userVoteData} />
              </div>
            </div>

            {/* Enhanced Poll Content */}
            <div className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-foreground line-clamp-2">
                  {safePoll.title}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 leading-relaxed">
                  {safePoll.description}
                </p>
              </div>

              {/* Enhanced Poll Options */}
              <div className="space-y-3">
                {safePoll.options.slice(0, 2).map((option, index) => (
                  <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate pr-3">{option}</span>
                      <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">{Number(votes[index]) || 0}</span>
                      </div>
                    </div>
                    <Progress 
                      value={getVotePercentage(index)} 
                      className="h-2"
                    />
                  </div>
                ))}
                
                {safePoll.options.length > 2 && (
                  <p className="text-sm text-muted-foreground text-center py-2 bg-muted/20 rounded-lg">
                    +{safePoll.options.length - 2} more options
                  </p>
                )}
              </div>

              {/* Enhanced Poll Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-muted-foreground pt-3 border-t border-border/50 gap-3 sm:gap-0">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="truncate font-medium">{getTimeRemaining()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{getTotalVotes()} votes</span>
                  </div>
                </div>
              </div>

              {/* Enhanced User Vote Status */}
              {userVoted && userVoteData && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    You voted for: <strong className="text-emerald-600">{safePoll.options[userVoteData.option] || 'Unknown option'}</strong>
                  </span>
                </div>
              )}
            </div>
            
            {/* Enhanced Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4 pt-4 overflow-x-auto">
              {canVote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVotingModal(true)}
                  className="engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg text-primary hover:text-primary-foreground hover:bg-primary flex-shrink-0"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Vote</span>
                </Button>
              )}
              
              {canViewResults && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResultsModal(true)}
                  className="engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg flex-shrink-0"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Results</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handlePollClick}
                className="engagement-button flex items-center space-x-2 px-4 py-2 rounded-lg flex-shrink-0"
              >
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">View Poll</span>
                <span className="text-sm sm:hidden">View</span>
              </Button>

              {/* Creator-only actions */}
              {currentUser && isServerPoll(safePoll) && currentUser.walletAddress === safePoll.creator.walletAddress && (
                <div className="flex items-center space-x-1">
                  {isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to close this poll? This will prevent further voting.')) {
                          return;
                        }
                        try {
                          const response = await fetch(`/api/polls/${safePoll.id}/close`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              walletAddress: currentUser.walletAddress
                            }),
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Failed to close poll');
                          }

                          const { toast } = await import('@/hooks/use-toast');
                          toast({
                            title: "Poll Closed",
                            description: "The poll has been closed successfully.",
                          });
                          
                          // Refresh the page to update poll status
                          window.location.reload();
                        } catch (error) {
                          console.error('Failed to close poll:', error);
                          const { toast } = await import('@/hooks/use-toast');
                          toast({
                            title: "Failed to Close Poll",
                            description: error instanceof Error ? error.message : "Failed to close the poll.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="engagement-button flex items-center space-x-1 p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Close</span>
                    </Button>
                  )}
                  {isClosed && !isResolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Navigate to poll page where creator can resolve
                        setLocation(`/prediction-polls?poll=${safePoll.id}`);
                      }}
                      className="engagement-button flex items-center space-x-1 p-2 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Resolve</span>
                    </Button>
                  )}
                </div>
              )}

              {!isConnected && (
                <WalletGatedInteraction action="vote">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="engagement-button flex items-center space-x-1 sm:space-x-2 p-2 rounded-lg flex-shrink-0"
                  >
                    <Target className="h-4 w-4 sm:text-lg" />
                    <span className="text-xs sm:text-sm hidden sm:inline">Connect to Vote</span>
                    <span className="text-xs sm:hidden">Connect</span>
                  </Button>
                </WalletGatedInteraction>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Voting Modal */}
      {showVotingModal && (
        <PollVotingModal
          poll={safePoll}
          onClose={() => setShowVotingModal(false)}
          onVote={async () => {
            setShowVotingModal(false);
            // Refresh polls data after voting
            await refreshPolls();
            // Reload local poll data
            if (address) {
              const pollId = isServerPoll(poll) ? safePoll.id : safePoll.id.toString();
              try {
                const response = await fetch(`/api/polls/${pollId}?currentUserId=${currentUser?.id || ''}&walletAddress=${address || ''}`);
                if (response.ok) {
                  const updatedPoll = await response.json();
                  // Update local state with fresh data
                  const votesArray = Array.isArray(updatedPoll.votes) ? updatedPoll.votes : Object.values(updatedPoll.votes || {});
                  
                  setVotes(votesArray.map((v: any) => Number(v) || 0));
                  setUserVoted(!!updatedPoll.userVote);
                  setUserVoteData(updatedPoll.userVote || null);
                }
              } catch (error) {
                console.error('Failed to refresh poll data:', error);
              }
            }
            onVote?.();
          }}
        />
      )}

      {/* Results Modal */}
      {showResultsModal && (
        <PollResultsModal
          poll={poll}
          votes={votes || []}
          onClose={() => setShowResultsModal(false)}
        />
      )}
    </>
  );
}
