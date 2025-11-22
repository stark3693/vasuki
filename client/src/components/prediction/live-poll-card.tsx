import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Clock, Users, TrendingUp, Target, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { Poll } from '../../lib/web3-config';
import { livePollService } from '../../lib/live-poll-service';

interface LivePollCardProps {
  poll: Poll;
  onVote: () => void;
  onResolve?: () => void;
  showLiveIndicator?: boolean;
}

export function LivePollCard({ poll, onVote, onResolve, showLiveIndicator = true }: LivePollCardProps) {
  const [liveVoteCount, setLiveVoteCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const handlePollUpdate = (update: any) => {
      if (update.pollId === poll.id || update.pollId === poll.id.toString()) {
        console.log('🔄 Live poll update for poll', poll.id, update);
        
        if (update.type === 'vote') {
          setLiveVoteCount(prev => prev + 1);
          setIsLive(true);
          setLastUpdate(new Date());
          
          // Reset live indicator after 5 seconds
          setTimeout(() => setIsLive(false), 5000);
        }
      }
    };

    livePollService.onUpdate(handlePollUpdate);

    return () => {
      livePollService.offUpdate(handlePollUpdate);
    };
  }, [poll.id]);

  // Calculate vote percentages
  const totalVotes = Array.isArray(poll.votes) 
    ? poll.votes.reduce((sum, count) => sum + count, 0)
    : Object.values(poll.votes || {}).reduce((sum, count) => sum + count, 0);

  const getVoteCount = (optionIndex: number) => {
    if (Array.isArray(poll.votes)) {
      return poll.votes[optionIndex] || 0;
    }
    return (poll.votes as { [key: number]: number })?.[optionIndex] || 0;
  };

  const getVotePercentage = (optionIndex: number) => {
    const count = getVoteCount(optionIndex);
    return totalVotes > 0 ? (count / totalVotes) * 100 : 0;
  };

  const getStakeAmount = (optionIndex: number) => {
    if (Array.isArray(poll.stakes)) {
      return poll.stakes[optionIndex] || '0';
    }
    return (poll.stakes as { [key: number]: string })?.[optionIndex] || '0';
  };

  const isPollActive = new Date(poll.deadline * 1000) > new Date();
  const isPollResolved = poll.isResolved;

  return (
    <Card className={`relative transition-all duration-300 ${isLive ? 'ring-2 ring-green-500 shadow-lg' : ''}`}>
      {/* Live Indicator */}
      {showLiveIndicator && isLive && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10">
          <Badge className="bg-green-500 text-white animate-pulse text-xs px-2 py-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1 animate-ping"></div>
            LIVE
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight">
              {poll.title}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
              {poll.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 sm:flex-col sm:gap-1">
            {isPollActive ? (
              <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : isPollResolved ? (
              <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500 text-gray-700 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Closed
              </Badge>
            )}
            
            {poll.isStakingEnabled && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Staking
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        {/* Live Vote Counter */}
        {isLive && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">
                +{liveVoteCount} new vote{liveVoteCount !== 1 ? 's' : ''} just cast!
              </span>
            </div>
            {lastUpdate && (
              <span className="text-xs text-green-600 sm:ml-auto">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Vote Options */}
        <div className="space-y-4">
          {poll.options.map((option, index) => {
            const voteCount = getVoteCount(index);
            const votePercentage = getVotePercentage(index);
            const stakeAmount = getStakeAmount(index);

            return (
              <div key={index} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm flex-1 break-words leading-relaxed">{option}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    </span>
                    {poll.isStakingEnabled && parseFloat(stakeAmount) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {parseFloat(stakeAmount).toFixed(2)} VSK
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress 
                  value={votePercentage} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {votePercentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Poll Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-muted-foreground mb-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              Total Votes
            </div>
            <div className="font-semibold text-base sm:text-lg">
              {totalVotes + (isLive ? liveVoteCount : 0)}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              Total Staked
            </div>
            <div className="font-semibold text-base sm:text-lg">
              {parseFloat(poll.totalStaked || '0').toFixed(2)} VSK
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground p-2 bg-muted/20 rounded-lg">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="break-words">
            {isPollActive ? 'Ends' : isPollResolved ? 'Resolved on' : 'Ended on'}{' '}
            {new Date(poll.deadline * 1000).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        {isPollActive && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={onVote}
              className="flex-1 h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base font-medium"
            >
              <Target className="h-4 w-4 mr-2" />
              Vote Now
            </Button>
            {poll.isStakingEnabled && (
              <Button
                variant="outline"
                className="h-10 sm:h-11 border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900 text-sm sm:text-base font-medium"
              >
                <Zap className="h-4 w-4 mr-2" />
                Stake
              </Button>
            )}
          </div>
        )}

        {/* Resolution Info */}
        {isPollResolved && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>Correct Answer:</strong> {poll.options[poll.correctOption]}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
