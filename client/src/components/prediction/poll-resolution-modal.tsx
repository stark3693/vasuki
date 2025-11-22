import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertCircle, Target, Trophy, Users, Coins } from 'lucide-react';
import { Poll } from '../../lib/web3-config';
import { useWalletWeb3 } from '../../hooks/use-wallet-web3';
import { toast } from '../../hooks/use-toast';

interface PollResolutionModalProps {
  poll: Poll;
  onClose: () => void;
  onResolve: (correctOption: number) => Promise<void>;
}

export function PollResolutionModal({ poll, onClose, onResolve }: PollResolutionModalProps) {
  const { address } = useWalletWeb3();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    if (selectedOption === null) {
      toast({
        title: "Please select an option",
        description: "You must select the correct answer before resolving the poll.",
        variant: "destructive",
      });
      return;
    }

    setIsResolving(true);
    try {
      await onResolve(selectedOption);
      toast({
        title: "Poll Resolved! 🎉",
        description: `The poll has been resolved with "${poll.options[selectedOption]}" as the correct answer.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to resolve poll:', error);
      toast({
        title: "Resolution Failed",
        description: error instanceof Error ? error.message : "Failed to resolve the poll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const canResolve = address && (
    (typeof poll.creator === 'string' && poll.creator === address) ||
    (typeof poll.creator === 'object' && poll.creator.walletAddress === address)
  );

  if (!canResolve) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cannot Resolve Poll
            </DialogTitle>
            <DialogDescription>
              Only the poll creator can resolve this poll.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              You must be the creator of this poll to resolve it.
            </p>
            <Button onClick={onClose} className="w-full mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            Resolve Poll
          </DialogTitle>
          <DialogDescription>
            Select the correct answer to resolve this poll and distribute rewards to winners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Poll Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{poll.title}</h3>
                <p className="text-sm text-muted-foreground">{poll.description}</p>
                
                {/* Poll Stats */}
                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Total Votes</span>
                  </div>
                  {poll.isStakingEnabled && (
                    <div className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      <span>Staking Enabled</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Important: Resolution is Final
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Once you resolve this poll, the correct answer cannot be changed. 
                  Make sure you select the accurate result based on the poll criteria.
                </p>
              </div>
            </div>
          </div>

          {/* Option Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select the correct answer:</Label>
            <RadioGroup
              value={selectedOption?.toString() || ""}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              className="space-y-3"
            >
              {poll.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {selectedOption === index && (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={selectedOption === null || isResolving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isResolving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resolving...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Resolve Poll
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
