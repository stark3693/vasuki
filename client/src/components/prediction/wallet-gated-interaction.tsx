import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Users, Lock } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

interface WalletGatedInteractionProps {
  children: React.ReactNode;
  action: 'create' | 'vote' | 'resolve';
  fallbackMessage?: string;
  onConnect?: () => void;
}

export function WalletGatedInteraction({ 
  children, 
  action, 
  fallbackMessage,
  onConnect 
}: WalletGatedInteractionProps) {
  const { walletAddress, isConnected } = useWallet();

  // If wallet is connected, show the children (actual functionality)
  if (isConnected && walletAddress) {
    return <>{children}</>;
  }

  // If wallet is not connected, show gated message
  const getActionMessage = () => {
    switch (action) {
      case 'create':
        return 'Connect your wallet to create prediction polls';
      case 'vote':
        return 'Connect your wallet to vote on this poll';
      case 'resolve':
        return 'Connect your wallet to resolve this poll';
      default:
        return 'Connect your wallet to interact';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'create':
        return <Users className="h-5 w-5" />;
      case 'vote':
        return <Wallet className="h-5 w-5" />;
      case 'resolve':
        return <Lock className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <CardTitle className="text-orange-800 dark:text-orange-200">
              Wallet Connection Required
            </CardTitle>
          </div>
          <CardDescription className="text-orange-700 dark:text-orange-300">
            {fallbackMessage || getActionMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              To {action} on prediction polls, you need to connect your Web3 wallet. 
              This ensures secure, transparent, and immutable transactions on the blockchain.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (onConnect) {
                    onConnect();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Specific components for different actions
export function WalletGatedCreatePoll({ children }: { children: React.ReactNode }) {
  return (
    <WalletGatedInteraction action="create">
      {children}
    </WalletGatedInteraction>
  );
}

export function WalletGatedVote({ children }: { children: React.ReactNode }) {
  return (
    <WalletGatedInteraction action="vote">
      {children}
    </WalletGatedInteraction>
  );
}

export function WalletGatedResolve({ children }: { children: React.ReactNode }) {
  return (
    <WalletGatedInteraction action="resolve">
      {children}
    </WalletGatedInteraction>
  );
}
