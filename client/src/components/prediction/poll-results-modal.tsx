import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Trophy, Users, CheckCircle, XCircle } from 'lucide-react';
import { Poll, ServerPoll } from '../../lib/web3-config';

// Type guard to check if poll is ServerPoll
function isServerPoll(poll: Poll | ServerPoll): poll is ServerPoll {
  return typeof poll.id === 'string';
}

interface PollResultsModalProps {
  poll: Poll | ServerPoll;
  votes: number[];
  onClose: () => void;
}

export function PollResultsModal({ poll, votes, onClose }: PollResultsModalProps) {
  // Debug logging
  console.log('PollResultsModal opened with:', {
    poll,
    votes,
    votesType: typeof votes,
    votesIsArray: Array.isArray(votes)
  });
  
  // Safely handle votes data
  const safeVotes = Array.isArray(votes) ? votes : (votes ? Object.values(votes) : []);
  
  const totalVotes: number = safeVotes.reduce((sum: number, vote: any) => sum + (Number(vote) || 0), 0);
  const votesArray: number[] = safeVotes.map((v: any) => Number(v) || 0);
  
  const maxVotes = votesArray.length > 0 ? Math.max(...votesArray) : 0;
  const winningOptionIndex = votesArray.indexOf(maxVotes);

  const getVotePercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return (voteCount / totalVotes) * 100;
  };


  const isCorrectOption = (index: number) => {
    return poll.isResolved && poll.correctOption !== undefined && index === poll.correctOption;
  };


  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            Poll Results
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Final results for: <strong className="break-words">{poll.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Poll Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {poll.isResolved ? (
                <>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300 text-sm sm:text-base">
                    Resolved
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-300 text-sm sm:text-base">
                    <span className="hidden sm:inline">Closed (Pending Resolution)</span>
                    <span className="sm:hidden">Closed</span>
                  </span>
                </>
              )}
            </div>
            {poll.isResolved && poll.correctOption !== undefined && (
              <Badge variant="outline" className="border-green-500 text-green-500 text-xs sm:text-sm">
                <span className="hidden sm:inline">Correct: </span>{poll.options[poll.correctOption]}
              </Badge>
            )}
          </div>

          {/* Poll Description */}
          <div className="p-3 sm:p-4 bg-muted rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground break-words">{poll.description}</p>
          </div>

          {/* Results */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Vote Results</h3>
            {(Array.isArray(poll.options) ? poll.options : []).map((option, index) => {
              const optionVotes = votesArray[index] || 0;
              const votePercentage = getVotePercentage(optionVotes);
              const isWinner = !poll.isResolved && optionVotes === maxVotes && maxVotes > 0;
              const isCorrect = isCorrectOption(index);

              return (
                <Card key={index} className={`transition-all ${
                  isWinner ? 'ring-2 ring-yellow-500' : 
                  isCorrect ? 'ring-2 ring-green-500' : ''
                }`}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Option Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                          <span className="font-medium text-sm sm:text-base truncate">{option}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            {isWinner && !poll.isResolved && (
                              <Badge variant="default" className="bg-yellow-500 text-xs">
                                Leading
                              </Badge>
                            )}
                            {isCorrect && (
                              <Badge variant="default" className="bg-green-500 text-xs">
                                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                Correct
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-base sm:text-lg font-bold">{optionVotes}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">votes</div>
                        </div>
                      </div>

                      {/* Vote Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Votes</span>
                          <span>{votePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={votePercentage} className="h-2" />
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Stats */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Total Votes</span>
                  </div>
                  <div className="text-2xl font-bold">{totalVotes}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
