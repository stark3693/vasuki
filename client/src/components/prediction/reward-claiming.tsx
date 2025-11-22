import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Trophy, Coins, TrendingUp, CheckCircle, Gift, Star, Zap } from 'lucide-react';
import { Poll } from '../../lib/web3-config';
import { toast } from '../../hooks/use-toast';
import { enhancedStakingSystem } from '../../lib/enhanced-staking-system';

interface RewardClaimingProps {
  poll: Poll;
  userAddress: string;
  userVote: { option: number; timestamp: number } | null;
  onRewardClaimed?: () => void;
}

export function RewardClaiming({ poll, userAddress, userVote, onRewardClaimed }: RewardClaimingProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get enhanced staking positions for this poll
  const userStakingPositions = enhancedStakingSystem.getUserStakingPositions(poll.id, userAddress);
  const pollStakingInfo = enhancedStakingSystem.getPollStakingInfo(poll.id);
  
  // Check if user is eligible for rewards using enhanced staking system
  const isEligibleForReward = userVote && userVote.option === poll.correctOption;
  const hasClaimedReward = userStakingPositions.every(position => 
    position.option === poll.correctOption ? position.isClaimed : true
  );
  const canClaimReward = isEligibleForReward && !hasClaimedReward && poll.isResolved && pollStakingInfo?.isResolved;

  // Calculate potential reward using enhanced staking system
  const calculateReward = () => {
    if (!userVote || !isEligibleForReward || !pollStakingInfo?.isResolved) return 0;
    
    // Get all positions that can be claimed
    const claimablePositions = userStakingPositions.filter(position => 
      position.option === pollStakingInfo.correctOption && 
      !position.isClaimed && 
      position.rewardAmount && 
      position.rewardAmount > 0
    );
    
    return claimablePositions.reduce((total, position) => total + (position.rewardAmount || 0), 0);
  };

  const potentialReward = calculateReward();

  const handleClaimReward = async () => {
    if (!canClaimReward) return;

    setIsClaiming(true);
    try {
      let totalClaimed = 0;
      
      // Claim rewards for all eligible positions using enhanced staking system
      for (let i = 0; i < userStakingPositions.length; i++) {
        const position = userStakingPositions[i];
        if (position.option === pollStakingInfo?.correctOption && 
            !position.isClaimed && 
            position.rewardAmount && 
            position.rewardAmount > 0) {
          
          try {
            const rewardAmount = await enhancedStakingSystem.claimRewards(
              poll.id,
              userAddress,
              i
            );
            totalClaimed += rewardAmount;
            console.log(`💰 Claimed ${rewardAmount} rewards for position ${i}`);
          } catch (error) {
            console.error(`Failed to claim rewards for position ${i}:`, error);
          }
        }
      }
      
      if (totalClaimed > 0) {
        // Trigger balance update event
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { userAddress }
        }));
        
        toast({
          title: '🎉 Reward Claimed!',
          description: `You've successfully claimed your reward for your correct prediction!`,
        });

        onRewardClaimed?.();
        setIsDialogOpen(false);
      } else {
        throw new Error('No rewards available to claim');
      }
    } catch (error) {
      console.error('Claim reward error:', error);
      toast({
        title: 'Claim Failed',
        description: error instanceof Error ? error.message : 'Failed to claim reward. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!canClaimReward) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white">
          <Trophy className="h-4 w-4 mr-2" />
          Claim Reward
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Claim Your Reward
          </DialogTitle>
          <DialogDescription>
            Congratulations! You predicted correctly and earned a reward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reward Summary */}
          <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:border-yellow-800 dark:from-yellow-950 dark:to-orange-950">
            <CardContent className="pt-4">
              <div className="text-center space-y-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full w-fit mx-auto">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    🎉 Congratulations!
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    You correctly predicted "{poll.options[poll.correctOption]}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reward Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reward Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-sm text-muted-foreground">Reward Amount</div>
                  <div className="font-semibold text-blue-600">
                    {potentialReward}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800 dark:text-purple-200">
                    Reward Calculation
                  </span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Based on your stake amount and the total pool size, you've earned a proportional reward for your correct prediction.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClaimReward}
              disabled={isClaiming}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              {isClaiming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Claim {potentialReward}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for displaying reward status on poll cards
export function RewardStatus({ poll, userVote }: { poll: Poll; userVote: any }) {
  const pollStakingInfo = enhancedStakingSystem.getPollStakingInfo(poll.id);
  const isEligibleForReward = userVote && userVote.option === poll.correctOption;
  
  // Check if user has claimed rewards using enhanced staking system
  const userStakingPositions = userVote ? enhancedStakingSystem.getUserStakingPositions(poll.id, userVote.userAddress || '') : [];
  const hasClaimedReward = userStakingPositions.every(position => 
    position.option === poll.correctOption ? position.isClaimed : true
  );

  if (!poll.isResolved || !pollStakingInfo?.isResolved) return null;

  if (isEligibleForReward && !hasClaimedReward) {
    return (
      <Badge variant="outline" className="border-yellow-400 text-yellow-700 dark:text-yellow-300">
        <Trophy className="h-3 w-3 mr-1" />
        Reward Available
      </Badge>
    );
  }

  if (isEligibleForReward && hasClaimedReward) {
    return (
      <Badge variant="outline" className="border-green-400 text-green-700 dark:text-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Reward Claimed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-gray-400 text-gray-600 dark:text-gray-400">
      <Coins className="h-3 w-3 mr-1" />
      No Reward
    </Badge>
  );
}
