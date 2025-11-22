import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Lock, Shield } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

interface WalletRequiredGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function WalletRequiredGuard({ children, redirectTo = '/' }: WalletRequiredGuardProps) {
  const { isConnected, walletAddress } = useWallet();

  // If wallet is connected, show the children (actual content)
  if (isConnected && walletAddress) {
    return <>{children}</>;
  }

  // If wallet is not connected, show strict access control message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md mx-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-800 dark:text-red-200">
            Wallet Authentication Required
          </CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            This is a secure, wallet-gated area. You must connect your Web3 wallet to access poll content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Lock className="h-4 w-4" />
              <span>Strict Authentication Required</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              All poll viewing, creation, and voting requires active wallet connection.
              This ensures secure, blockchain-backed interactions only.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = redirectTo} 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet to Access
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-red-500 dark:text-red-400">
                No preview or limited access available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to check if wallet access is required
export function useWalletAccess() {
  const { isConnected, walletAddress } = useWallet();
  
  return {
    hasAccess: isConnected && !!walletAddress,
    isConnected,
    walletAddress,
    redirectToWallet: () => window.location.href = '/'
  };
}

