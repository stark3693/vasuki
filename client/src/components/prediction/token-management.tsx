import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Coins, TrendingUp, Wallet, Lock, Unlock } from 'lucide-react';
import { vskTokenSystem } from '../../lib/vsk-token-system';
import { toast } from '../../hooks/use-toast';

interface TokenManagementProps {
  walletAddress: string;
  onBalanceUpdate?: () => void;
}

export function TokenManagement({ walletAddress, onBalanceUpdate }: TokenManagementProps) {
  const [isStakeDialogOpen, setIsStakeDialogOpen] = useState(false);
  const [isUnstakeDialogOpen, setIsUnstakeDialogOpen] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const balance = vskTokenSystem.getBalance(walletAddress);
  const stakedBalance = vskTokenSystem.getStakedBalance(walletAddress);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (amount <= 0 || amount > balance) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount that you can afford to stake.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate staking transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = vskTokenSystem.stake(walletAddress, amount);
      if (success) {
        toast({
          title: 'Tokens Staked!',
          description: `${amount} VSK tokens have been staked successfully.`,
        });
        setStakeAmount('');
        setIsStakeDialogOpen(false);
        onBalanceUpdate?.();
      } else {
        throw new Error('Staking failed');
      }
    } catch (error) {
      toast({
        title: 'Staking Failed',
        description: 'Failed to stake tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (amount <= 0 || amount > stakedBalance) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount that you have staked.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate unstaking transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = vskTokenSystem.unstake(walletAddress, amount);
      if (success) {
        toast({
          title: 'Tokens Unstaked!',
          description: `${amount} VSK tokens have been unstaked successfully.`,
        });
        setUnstakeAmount('');
        setIsUnstakeDialogOpen(false);
        onBalanceUpdate?.();
      } else {
        throw new Error('Unstaking failed');
      }
    } catch (error) {
      toast({
        title: 'Unstaking Failed',
        description: 'Failed to unstake tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Token Management
        </CardTitle>
        <CardDescription>
          Manage your VSK tokens for staking in prediction polls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Available Balance
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {balance.toLocaleString()} VSK
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Staked Balance
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {stakedBalance.toLocaleString()} VSK
            </div>
          </div>
        </div>

        {/* Staking Actions */}
        <div className="flex gap-3">
          <Dialog open={isStakeDialogOpen} onOpenChange={setIsStakeDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={balance === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Lock className="h-4 w-4 mr-2" />
                Stake Tokens
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stake VSK Tokens</DialogTitle>
                <DialogDescription>
                  Stake your VSK tokens to participate in prediction polls with staking enabled.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stake-amount">Amount to Stake (VSK)</Label>
                  <Input
                    id="stake-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    max={balance}
                    min={1}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Available: {balance.toLocaleString()} VSK
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsStakeDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStake}
                    disabled={isProcessing || !stakeAmount}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? 'Staking...' : 'Stake Tokens'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isUnstakeDialogOpen} onOpenChange={setIsUnstakeDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={stakedBalance === 0}
                variant="outline"
                className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Unstake Tokens
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unstake VSK Tokens</DialogTitle>
                <DialogDescription>
                  Unstake your VSK tokens to return them to your available balance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="unstake-amount">Amount to Unstake (VSK)</Label>
                  <Input
                    id="unstake-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    max={stakedBalance}
                    min={1}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Staked: {stakedBalance.toLocaleString()} VSK
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsUnstakeDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUnstake}
                    disabled={isProcessing || !unstakeAmount}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isProcessing ? 'Unstaking...' : 'Unstake Tokens'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                How Staking Works
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Staked tokens can be used to vote on polls with staking enabled. 
                Correct predictions may earn you rewards when polls are resolved.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
