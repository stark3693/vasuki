import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Clock, Users, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { Poll, PollStatus, ServerPoll } from '../../lib/web3-config';

// Type guard to check if poll is ServerPoll
function isServerPoll(poll: Poll | ServerPoll): poll is ServerPoll {
  return typeof poll.id === 'string';
}

// Convert ServerPoll to Poll format for components that expect Poll type
function convertToPoll(poll: Poll | ServerPoll): Poll {
  if (isServerPoll(poll)) {
    // Convert string ID to number for compatibility with Poll interface
    const numericId = parseInt(poll.id.replace(/\D/g, '')) || 0;
    return {
      ...poll,
      id: numericId,
      originalId: poll.id, // Preserve the original UUID string ID for voting
      creator: poll.creator.walletAddress,
      deadline: Math.floor(new Date(poll.deadline).getTime() / 1000),
      status: poll.status as any
    };
  }
  return poll;
}
import { useWalletWeb3 } from '../../hooks/use-wallet-web3';
import { usePolls } from '../../hooks/use-polls';
import { formatDistanceToNow } from 'date-fns';
import { PollVotingModal } from './poll-voting-modal';
import { PollResultsModal } from './poll-results-modal';
import { PollResolutionModal } from './poll-resolution-modal';
import { WalletGatedInteraction } from './wallet-gated-interaction';
import { RewardClaiming, RewardStatus } from './reward-claiming';
import { toast } from '../../hooks/use-toast';

interface PollCardProps {
  poll: Poll | ServerPoll;
  onVote?: () => void;
  onResolve?: () => void;
}

export function PollCard({ poll, onVote, onResolve }: PollCardProps) {
  const { address, isConnected } = useWalletWeb3();
  const { hasUserVoted, getUserVote, getPollVotes, refreshPolls } = usePolls();
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  const [userVoted, setUserVoted] = useState(false);
  const [userVoteData, setUserVoteData] = useState<{ option: number; timestamp: number } | null>(null);
  const [votes, setVotes] = useState<number[]>([]);

  // Load poll data - use data directly from poll object for server polls
  React.useEffect(() => {
    const loadPollData = async () => {
      if (address) {
        if (isServerPoll(poll)) {
          // For server polls, use the data directly from the poll object
          const votesArray = Array.isArray(poll.votes) ? poll.votes : Object.values(poll.votes || {});
          
          setVotes(votesArray.map(v => Number(v) || 0));
          setUserVoted(!!(poll as ServerPoll).userVote);
          setUserVoteData((poll as ServerPoll).userVote || null);
          
          console.log('Server poll data loaded:', {
            pollId: poll.id,
            votes: votesArray,
            userVote: (poll as ServerPoll).userVote
          });
        } else {
          // For blockchain polls, use the old method
          const pollId = poll.id.toString();
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
  }, [poll.id, address, poll.votes, (poll as ServerPoll).userVote]);

  const now = Math.floor(Date.now() / 1000);
  const deadline = isServerPoll(poll) ? Math.floor(new Date(poll.deadline).getTime() / 1000) : poll.deadline;
  const isExpired = now >= deadline;
  const isActive = !isExpired && !poll.isResolved;
  const isClosed = isExpired && !poll.isResolved;
  const isResolved = poll.isResolved;

  const getStatus = (): PollStatus => {
    if (isResolved) return PollStatus.RESOLVED;
    if (isClosed) return PollStatus.CLOSED;
    return PollStatus.ACTIVE;
  };

  const getStatusBadge = () => {
    const status = getStatus();
    switch (status) {
      case PollStatus.ACTIVE:
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
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
      const deadlineDate = isServerPoll(poll) ? new Date(poll.deadline) : new Date(poll.deadline * 1000);
      
      // Check if the date is valid
      if (isNaN(deadlineDate.getTime())) {
        console.warn('Invalid deadline date:', poll.deadline);
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
  const canResolve = isConnected && isClosed && (
    (typeof poll.creator === 'string' && poll.creator === address) ||
    (typeof poll.creator === 'object' && poll.creator.walletAddress === address)
  );
  const isPollCreator = isConnected && (
    (typeof poll.creator === 'string' && poll.creator === address) ||
    (typeof poll.creator === 'object' && poll.creator.walletAddress === address)
  );
  const canViewResults = true; // Allow viewing results for all polls
  
  // Debug logging
  console.log('Poll Debug:', {
    pollId: poll.id,
    isConnected,
    isActive,
    userVoted,
    canVote,
    isResolved,
    isClosed,
    isExpired,
    deadline,
    now,
    canViewResults,
    votes
  });

  return (
    <>
      <Card className="w-full hover:shadow-lg transition-shadow">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-2 min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg leading-tight">{poll.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm sm:text-base">
                {poll.description}
              </CardDescription>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Created by {typeof poll.creator === 'string' 
                  ? `${poll.creator.slice(0, 6)}...${poll.creator.slice(-4)}`
                  : poll.creator.displayName || poll.creator.uniqueId || 'Unknown User'
                }</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              <RewardStatus poll={convertToPoll(poll)} userVote={userVoteData} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Poll Options */}
          <div className="space-y-3">
            {(Array.isArray(poll.options) ? poll.options : []).map((option, index) => (
              <div key={index} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm sm:text-base font-medium truncate">{option}</span>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    {Number(votes[index]) || 0} votes
                  </div>
                </div>
                <Progress 
                  value={getVotePercentage(index)} 
                  className="h-1.5 sm:h-2"
                />
              </div>
            ))}
          </div>

          {/* Poll Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm text-muted-foreground pt-2 border-t gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">{getTimeRemaining()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                {getTotalVotes()} votes
              </div>
            </div>
          </div>

          {/* User Vote Status */}
          {userVoted && userVoteData && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                You voted for: <strong>{poll.options[userVoteData.option]}</strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {canVote && (
              <Button 
                onClick={() => setShowVotingModal(true)}
                className="flex-1 h-10 sm:h-11"
              >
                Vote Now
              </Button>
            )}
            
            {canResolve && (
              <>
                <Button 
                  onClick={() => setShowResolutionModal(true)}
                  variant="outline"
                  className="flex-1 h-10 sm:h-11"
                >
                  Resolve Poll
                </Button>
                {isActive && (
                  <Button 
                    onClick={async () => {
                      if (!confirm('Are you sure you want to close this poll? This will prevent further voting.')) {
                        return;
                      }
                      try {
                        const response = await fetch(`/api/polls/${poll.id}/close`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            walletAddress: address
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.message || 'Failed to close poll');
                        }

                        toast({
                          title: "Poll Closed",
                          description: "The poll has been closed successfully.",
                        });
                        
                        await refreshPolls();
                      } catch (error) {
                        console.error('Failed to close poll:', error);
                        toast({
                          title: "Failed to Close Poll",
                          description: error instanceof Error ? error.message : "Failed to close the poll.",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    className="flex-1 h-10 sm:h-11 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Close Poll
                  </Button>
                )}
              </>
            )}
            
            {canViewResults && (
              <Button 
                onClick={() => {
                  console.log('Opening results modal for poll:', poll.id);
                  setShowResultsModal(true);
                }}
                variant="outline"
                className="flex-1 h-10 sm:h-11"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View Results
              </Button>
            )}
            
            {/* Refresh button for testing */}
            <Button 
              onClick={() => {
                console.log('Refreshing poll data...');
                refreshPolls();
                // Reload poll data
                const loadPollData = async () => {
                  if (address && isServerPoll(poll)) {
                    const votesArray = Array.isArray(poll.votes) ? poll.votes : Object.values(poll.votes || {});
                    
                    setVotes(votesArray.map(v => Number(v) || 0));
                    setUserVoted(!!(poll as ServerPoll).userVote);
                    setUserVoteData((poll as ServerPoll).userVote || null);
                  }
                };
                loadPollData();
              }}
              variant="secondary"
              size="sm"
            >
              🔄 Refresh
            </Button>


            {/* Reward Claiming */}
            {poll.isResolved && userVoted && userVoteData && isConnected && address && (
              <RewardClaiming
                poll={convertToPoll(poll)}
                userAddress={address}
                userVote={userVoteData as any}
                onRewardClaimed={onVote}
              />
            )}

            {!isConnected && isActive && !userVoted && (
              <WalletGatedInteraction action="vote">
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline"
                  className="flex-1"
                >
                  Connect Wallet to Vote
                </Button>
              </WalletGatedInteraction>
            )}
            
            {isConnected && !isActive && !userVoted && (
              <Button 
                disabled
                variant="outline"
                className="flex-1"
              >
                Poll Closed
              </Button>
            )}
            
            {userVoted && (
              <Button 
                disabled
                variant="outline"
                className="flex-1"
              >
                Already Voted
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voting Modal */}
      {showVotingModal && (
        <PollVotingModal
          poll={convertToPoll(poll)}
          onClose={() => setShowVotingModal(false)}
          onVote={async () => {
            setShowVotingModal(false);
            // Refresh polls data after voting
            await refreshPolls();
            // Reload local poll data
            if (address) {
              const pollId = isServerPoll(poll) ? poll.id : poll.id.toString();
              try {
                const response = await fetch(`/api/polls/${pollId}?walletAddress=${address || ''}`);
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
          onClose={() => {
            console.log('Closing results modal');
            setShowResultsModal(false);
          }}
        />
      )}

      {/* Resolution Modal */}
      {showResolutionModal && (
        <PollResolutionModal
          poll={convertToPoll(poll)}
          onClose={() => setShowResolutionModal(false)}
          onResolve={async (correctOption: number) => {
            try {
              // Call the resolution API with wallet address
              const response = await fetch(`/api/polls/${poll.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  walletAddress: address,
                  correctOption
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to resolve poll');
              }

              console.log('Poll resolved successfully:', poll.id);
              
              // Refresh polls data
              await refreshPolls();
              onResolve?.();
              
            } catch (error) {
              console.error('Failed to resolve poll:', error);
              throw error;
            }
          }}
        />
      )}
      
    </>
  );
}
