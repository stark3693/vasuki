import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Target, Zap, CheckCircle } from 'lucide-react';
import { Poll } from '../../lib/web3-config';
import { useWalletWeb3 } from '../../hooks/use-wallet-web3';
import { usePolls } from '../../hooks/use-polls';
import { toast } from '../../hooks/use-toast';

interface PollVotingModalProps {
  poll: Poll;
  onClose: () => void;
  onVote: () => void;
}

export function PollVotingModal({ poll, onClose, onVote }: PollVotingModalProps) {
  const { address, voteOnPollContract, isVoting } = useWalletWeb3();
  const { vote } = usePolls();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [isRealTimeUpdate, setIsRealTimeUpdate] = useState(false);

  const handleVote = async () => {
    if (isProcessing) return; // Prevent multiple clicks
    
    if (selectedOption === null) {
      toast({
        title: 'Select an Option',
        description: 'Please select an option to vote for.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);


    try {
      // Try blockchain voting first if wallet is connected and contracts are available
      if (address && voteOnPollContract) {
        try {
          // Show transaction pending message
          setTransactionStatus('Submitting vote to blockchain...');
          toast({
            title: '🔄 Processing Vote...',
            description: 'Please wait while your vote is being processed on the blockchain.',
          });

          const result = await voteOnPollContract(
            (poll as any).originalId || poll.id, 
            selectedOption, 
            '0'
          );

          console.log('Vote transaction result:', result);
          setTransactionHash(result);
          setTransactionStatus('Vote submitted successfully!');
          setIsRealTimeUpdate(true);

          // Trigger real-time poll updates
          window.dispatchEvent(new CustomEvent('pollVoteCast', {
            detail: {
              pollId: (poll as any).originalId || poll.id,
              option: selectedOption,
              stakeAmount: '0',
              transactionHash: result,
              timestamp: Date.now()
            }
          }));

          toast({
            title: '🎉 Vote Cast Successfully!',
            description: `Your vote has been recorded on the blockchain for "${poll.options[selectedOption]}".`,
          });

          onVote();
          setIsProcessing(false);
          setTransactionStatus('');
          return;
        } catch (blockchainError) {
          console.warn('Blockchain voting failed, falling back to server API:', blockchainError);
          // Fall through to server API voting
        }
      }

      // Fallback to server API voting
      if (address) {
        try {
          // Show processing message
          setTransactionStatus('Submitting vote to server...');
          toast({
            title: '🔄 Processing Vote...',
            description: 'Please wait while your vote is being processed.',
          });

          await vote({
            pollId: (poll as any).originalId || poll.id.toString(),
            option: selectedOption
          });

          setTransactionStatus('Vote submitted successfully!');

          toast({
            title: '🎉 Vote Cast Successfully!',
            description: `Your vote has been recorded on the server for "${poll.options[selectedOption]}".`,
          });

          onVote();
          setIsProcessing(false);
          setTransactionStatus('');
          return;
        } catch (serverError) {
          console.warn('Server voting failed:', serverError);
          // Fall through to final error
        }
      }

      // If we reach here, both blockchain and server voting failed
      throw new Error('Unable to cast vote using any available method');

    } catch (error) {
      console.error('Voting failed:', error);
      toast({
        title: 'Voting Failed',
        description: error instanceof Error ? error.message : 'Failed to cast vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setTransactionStatus('');
    }
  };


  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mobile-poll-dialog w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-4 p-3 sm:p-6 pb-6 sm:pb-8">
        <DialogHeader className="space-y-2 sm:space-y-3 pb-2 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="leading-tight">Cast Your Vote</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm lg:text-base leading-relaxed">
            Make your prediction for: <strong className="break-words block sm:inline">{poll.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="mobile-poll-content space-y-3 sm:space-y-4 lg:space-y-6 pb-20 sm:pb-6">
          {/* Poll Description */}
          <div className="p-3 sm:p-4 bg-muted rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground break-words leading-relaxed">{poll.description}</p>
          </div>

          {/* Voting Options */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base font-medium block">Select your prediction:</Label>
            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              className="space-y-3"
            >
              {poll.options.map((option, index) => (
                <div key={index} className="mobile-radio-option flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors mobile-touch">
                  <RadioGroupItem 
                    value={index.toString()} 
                    id={`option-${index}`} 
                    className="mt-0.5 flex-shrink-0 mobile-focus" 
                  />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer text-sm sm:text-base break-words leading-relaxed mobile-touch"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>


          {/* Enhanced Vote Summary */}
          {selectedOption !== null && (
            <Card className="mobile-vote-summary border-green-200 bg-gradient-to-r from-green-50 to-blue-50 dark:border-green-800 dark:from-green-950 dark:to-blue-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200 text-sm sm:text-base">
                    Vote Summary
                  </h4>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Your Prediction:</span>
                    <span className="font-medium text-green-700 dark:text-green-300 text-xs sm:text-sm break-words">
                      {poll.options[selectedOption]}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Poll Status:</span>
                    <Badge variant="outline" className="border-green-400 text-green-700 dark:text-green-300 w-fit">
                      <Clock className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Status Display */}
          {(isProcessing || isRealTimeUpdate) && transactionStatus && (
            <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950 ${isRealTimeUpdate ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950' : ''}`}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    {isRealTimeUpdate ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0 mt-0.5"></div>
                    )}
                    <span className={`text-xs sm:text-sm font-medium leading-relaxed ${isRealTimeUpdate ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'}`}>
                      {transactionStatus}
                    </span>
                  </div>
                  
                  {transactionHash && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium block mb-1">Transaction Hash:</span>
                      <div className="mobile-transaction-hash font-mono break-all bg-muted px-2 py-2 rounded text-xs leading-relaxed">
                        {transactionHash}
                      </div>
                    </div>
                  )}
                  
                  {isRealTimeUpdate && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span>Live blockchain transaction confirmed</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Blockchain Status Notice */}
          {address && (
            <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg border border-green-200 dark:border-green-800 mb-4">
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 leading-relaxed">
                  <strong>🚀 Live Blockchain Voting:</strong> Your vote will be recorded on the blockchain in real-time with instant updates visible to all users worldwide.
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Actions - Mobile Optimized */}
          <div className="mobile-sticky-actions sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-4 mt-6 -mx-3 sm:-mx-6 px-3 sm:px-6">
            <div className="mobile-flex-col flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="mobile-action-button flex-1 h-12 sm:h-12 text-sm sm:text-base font-medium order-2 sm:order-1 mobile-touch"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVote}
                disabled={selectedOption === null || isVoting || isProcessing}
                className="mobile-action-button flex-1 h-12 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base font-medium order-1 sm:order-2 mobile-touch"
              >
                {isVoting || isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    <span>Cast Vote</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
