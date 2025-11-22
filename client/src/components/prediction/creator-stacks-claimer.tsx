import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Coins, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { usePollCreator } from '../../hooks/use-poll-creator';
import { Poll } from '../../lib/web3-config';

interface CreatorStacksClaimerProps {
  poll: Poll;
  onStacksClaimed?: () => void;
}

export function CreatorStacksClaimer({ poll, onStacksClaimed }: CreatorStacksClaimerProps) {
  const { 
    claimStacks, 
    getCreatorFeeInfo, 
    isPollCreator, 
    canClaimStacks, 
    isClaimingStacks, 
    isLoading 
  } = usePollCreator();

  const [creatorFeeInfo, setCreatorFeeInfo] = useState<{
    creatorFeePercent: number;
    creatorHasClaimed: boolean;
    totalStaked: string;
    creatorFeeAmount: string;
  } | null>(null);
  const [canClaim, setCanClaim] = useState(false);

  // Load creator fee information
  useEffect(() => {
    const loadFeeInfo = async () => {
      if (!poll.id || !isPollCreator(poll.creator)) return;

      try {
        const feeInfo = await getCreatorFeeInfo(Number(poll.id));
        if (feeInfo) {
          setCreatorFeeInfo(feeInfo);
        }
      } catch (error) {
        console.error('Failed to load creator fee info:', error);
      }
    };

    loadFeeInfo();
  }, [poll.id, poll.creator, isPollCreator, getCreatorFeeInfo]);

  // Check if can claim stacks
  useEffect(() => {
    const checkCanClaim = async () => {
      if (!poll.id || !isPollCreator(poll.creator)) {
        setCanClaim(false);
        return;
      }

      try {
        const canClaimResult = await canClaimStacks(
          Number(poll.id),
          poll.creator,
          poll.isResolved,
          creatorFeeInfo?.creatorHasClaimed || false
        );
        setCanClaim(canClaimResult);
      } catch (error) {
        console.error('Failed to check if can claim stacks:', error);
        setCanClaim(false);
      }
    };

    checkCanClaim();
  }, [poll.id, poll.creator, poll.isResolved, creatorFeeInfo, isPollCreator, canClaimStacks]);

  const handleClaimStacks = async () => {
    if (!poll.id || !canClaim) return;

    try {
      const success = await claimStacks(Number(poll.id));
      if (success) {
        // Refresh fee info after successful claim
        const updatedFeeInfo = await getCreatorFeeInfo(Number(poll.id));
        if (updatedFeeInfo) {
          setCreatorFeeInfo(updatedFeeInfo);
        }
        onStacksClaimed?.();
      }
    } catch (error) {
      console.error('Failed to claim stacks:', error);
    }
  };

  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  };

  const formatPercentage = (percent: number): string => {
    return `${(percent / 100).toFixed(1)}%`;
  };

  // Don't render if user is not the poll creator
  if (!isPollCreator(poll.creator)) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-950 dark:to-pink-950">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-purple-800 dark:text-purple-200">
            Creator Fee
          </CardTitle>
        </div>
        <CardDescription className="text-purple-700 dark:text-purple-300">
          Your fee from poll staking rewards
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        ) : creatorFeeInfo ? (
          <>
            {/* Fee Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Total Staked
                  </span>
                </div>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {formatAmount(creatorFeeInfo.totalStaked)} VSK
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Your Fee
                  </span>
                </div>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {formatAmount(creatorFeeInfo.creatorFeeAmount)} VSK
                </p>
              </div>
            </div>

            {/* Fee Percentage Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-purple-400 text-purple-700 dark:text-purple-300">
                {formatPercentage(creatorFeeInfo.creatorFeePercent)} Creator Fee
              </Badge>
            </div>

            {/* Status and Actions */}
            {creatorFeeInfo.creatorHasClaimed ? (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  You have successfully claimed your creator fee.
                </AlertDescription>
              </Alert>
            ) : !poll.isResolved ? (
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Poll must be resolved before you can claim your creator fee.
                </AlertDescription>
              </Alert>
            ) : canClaim ? (
              <div className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    You can now claim your creator fee.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={handleClaimStacks}
                  disabled={isClaimingStacks}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {isClaimingStacks ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Claim {formatAmount(creatorFeeInfo.creatorFeeAmount)} VSK
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-800 dark:text-gray-200">
                  No creator fee available to claim.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-800 dark:text-gray-200">
              Unable to load creator fee information.
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
}
