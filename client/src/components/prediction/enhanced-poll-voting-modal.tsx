import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { X, Coins, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useEnhancedStaking } from '@/hooks/use-enhanced-staking';
import { useWallet } from '@/hooks/use-wallet';
import { vskTokenSystem } from '@/lib/vsk-token-system';
import { useToast } from '@/hooks/use-toast';
import type { Poll } from '@/lib/web3-config';

interface EnhancedPollVotingModalProps {
  poll: Poll | any;
  onClose: () => void;
  onVote?: (pollId: string, option: number, stakeAmount: number) => void;
}

export function EnhancedPollVotingModal({ poll, onClose, onVote }: EnhancedPollVotingModalProps) {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  const {
    stakeForPoll,
    getUserStakingPositions,
    getPollStakingInfo,
    hasUserStakedInPoll,
    getUserStakeForOption,
    canUserClaimRewards,
    getTotalClaimableRewards,
    claimRewards,
    isStaking,
    isClaiming,
    canUserClaimRewards: canClaim
  } = useEnhancedStaking();

  const [selectedOption, setSelectedOption] = useState<number>(-1);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userStakes, setUserStakes] = useState<any[]>([]);
  const [pollStakingInfo, setPollStakingInfo] = useState<any>(null);
  const [canClaimRewards, setCanClaimRewards] = useState<boolean>(false);
  const [claimableRewards, setClaimableRewards] = useState<number>(0);

  // Load user data
  useEffect(() => {
    if (walletAddress) {
      const balance = vskTokenSystem.getBalance(walletAddress);
      setUserBalance(balance);
      
      const stakes = getUserStakingPositions(poll.id);
      setUserStakes(stakes);
      
      const stakingInfo = getPollStakingInfo(poll.id);
      setPollStakingInfo(stakingInfo);
      
      const canClaim = canUserClaimRewards(poll.id);
      setCanClaimRewards(canClaim);
      
      const rewards = getTotalClaimableRewards(poll.id);
      setClaimableRewards(rewards);
    }
  }, [walletAddress, poll.id, getUserStakingPositions, getPollStakingInfo, canUserClaimRewards, getTotalClaimableRewards]);

  // Handle stake amount change
  const handleStakeAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setStakeAmount('');
      return;
    }
    
    if (numValue > userBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${userBalance} VSK tokens available.`,
        variant: 'destructive'
      });
      return;
    }
    
    setStakeAmount(value);
  };

  // Handle stake tokens
  const handleStakeTokens = async () => {
    if (selectedOption === -1) {
      toast({
        title: 'Select an Option',
        description: 'Please select an option before staking tokens.',
        variant: 'destructive'
      });
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid stake amount.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const amount = parseFloat(stakeAmount);
      
      await stakeForPoll(poll.id, selectedOption, amount);
      
      toast({
        title: '🎯 Tokens Staked Successfully!',
        description: `You've staked ${amount} VSK tokens on option ${selectedOption + 1}.`,
      });

      // Refresh data
      const stakes = getUserStakingPositions(poll.id);
      setUserStakes(stakes);
      
      const balance = vskTokenSystem.getBalance(walletAddress!);
      setUserBalance(balance);
      setStakeAmount('');
      
      if (onVote) {
        onVote(poll.id, selectedOption, amount);
      }
      
    } catch (error) {
      console.error('Staking error:', error);
      toast({
        title: 'Staking Failed',
        description: error instanceof Error ? error.message : 'Failed to stake tokens.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle claim rewards
  const handleClaimRewards = async () => {
    if (!canClaimRewards) return;

    setIsProcessing(true);
    try {
      let totalClaimed = 0;
      
      // Claim rewards for all eligible positions
      for (let i = 0; i < userStakes.length; i++) {
        const stake = userStakes[i];
        if (stake.option === pollStakingInfo?.correctOption && 
            !stake.isClaimed && 
            stake.rewardAmount > 0) {
          const reward = await claimRewards(poll.id, i);
          totalClaimed += reward;
        }
      }
      
      toast({
        title: '💰 Rewards Claimed!',
        description: `You've claimed your rewards successfully.`,
      });

      // Refresh data
      const stakes = getUserStakingPositions(poll.id);
      setUserStakes(stakes);
      
      const balance = vskTokenSystem.getBalance(walletAddress!);
      setUserBalance(balance);
      
      const rewards = getTotalClaimableRewards(poll.id);
      setClaimableRewards(rewards);
      
    } catch (error) {
      console.error('Claim error:', error);
      toast({
        title: 'Claim Failed',
        description: error instanceof Error ? error.message : 'Failed to claim rewards.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasStaked = hasUserStakedInPoll(poll.id);
  const isPollResolved = pollStakingInfo?.isResolved || false;
  const correctOption = pollStakingInfo?.correctOption;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{poll.title}</CardTitle>
            <CardDescription>{poll.description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Poll Status */}
          <div className="flex items-center gap-2">
            {isPollResolved ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Resolved
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Active
              </Badge>
            )}
            {isPollResolved && correctOption !== undefined && (
              <Badge variant="default">
                Correct: Option {correctOption + 1}
              </Badge>
            )}
          </div>

          {/* User Balance */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span className="text-sm font-medium">Your VSK Balance</span>
              </div>
              <span className="font-mono text-lg font-bold">{userBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Claimable Rewards */}
          {canClaimRewards && claimableRewards > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <span>You have {claimableRewards.toLocaleString()} rewards to claim!</span>
                  <Button 
                    size="sm" 
                    onClick={handleClaimRewards}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* User's Current Stakes */}
          {hasStaked && (
            <div className="space-y-3">
              <h3 className="font-semibold">Your Stakes</h3>
              {userStakes.map((stake, index) => (
                <div key={index} className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Option {stake.option + 1}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {stake.stakeAmount.toLocaleString()} VSK
                      </span>
                    </div>
                    <div className="text-right">
                      {isPollResolved && stake.option === correctOption ? (
                        <div className="text-green-600">
                          {stake.isClaimed ? (
                            <Badge variant="secondary">Claimed</Badge>
                          ) : (
                            <div>
                              <div className="text-xs">Reward: {stake.rewardAmount?.toLocaleString() || 0} VSK</div>
                              <Badge variant="default" className="bg-green-600">Winner!</Badge>
                            </div>
                          )}
                        </div>
                      ) : isPollResolved ? (
                        <Badge variant="destructive">Lost</Badge>
                      ) : (
                        <Badge variant="outline">Staked</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Poll Options and Staking */}
          {!isPollResolved && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Select Option to Stake On</h3>
                
                {poll.options.map((option: string, index: number) => {
                  const optionStake = getUserStakeForOption(poll.id, index);
                  const totalStaked = pollStakingInfo?.totalStaked || 0;
                  const optionTotalStake = pollStakingInfo?.optionStakes?.[index] || 0;
                  const percentage = totalStaked > 0 ? (optionTotalStake / totalStaked) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id={`option-${index}`}
                            name="poll-option"
                            value={index}
                            checked={selectedOption === index}
                            onChange={() => setSelectedOption(index)}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`option-${index}`} className="font-medium cursor-pointer">
                            {option}
                          </label>
                        </div>
                        {optionStake > 0 && (
                          <Badge variant="outline">Your stake: {optionStake.toLocaleString()} VSK</Badge>
                        )}
                      </div>
                      
                      {/* Option staking progress */}
                      <div className="ml-7 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{optionTotalStake.toLocaleString()} VSK staked</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stake Amount Input */}
              {selectedOption !== -1 && (
                <div className="space-y-3">
                  <Label htmlFor="stake-amount">Stake Amount (VSK)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stake-amount"
                      type="number"
                      placeholder="Enter amount to stake"
                      value={stakeAmount}
                      onChange={(e) => handleStakeAmountChange(e.target.value)}
                      min="0"
                      max={userBalance}
                      step="0.1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStakeAmount(userBalance.toString())}
                    >
                      Max
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: {userBalance.toLocaleString()} VSK
                  </div>
                </div>
              )}

              {/* Stake Button */}
              {selectedOption !== -1 && (
                <Button
                  onClick={handleStakeTokens}
                  disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="w-full"
                >
                  {isStaking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Staking Tokens...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 mr-2" />
                      Stake {stakeAmount || '0'} VSK on Option {selectedOption + 1}
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* Poll Statistics */}
          {pollStakingInfo && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Poll Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Staked:</span>
                  <div className="font-mono font-bold">{pollStakingInfo.totalStaked.toLocaleString()} VSK</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Participants:</span>
                  <div className="font-mono font-bold">{Object.keys(pollStakingInfo.userStakes).length}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
