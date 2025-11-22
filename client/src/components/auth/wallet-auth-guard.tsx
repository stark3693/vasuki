import React from 'react';
import { useWallet } from '../../hooks/use-wallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Wallet, Shield, AlertTriangle, Download } from 'lucide-react';

interface WalletAuthGuardProps {
  children: React.ReactNode;
}

export function WalletAuthGuard({ children }: WalletAuthGuardProps) {
  const { isConnected, isConnecting, connectMetaMask } = useWallet();

  // If wallet is connected, render children
  if (isConnected) {
    return <>{children}</>;
  }

  // Show wallet connection requirement
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Wallet Required</CardTitle>
            <CardDescription className="text-lg">
              Connect your wallet to access Vasukii
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Secure Access:</strong> This application requires a real wallet connection for security and Web3 functionality.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Button 
                onClick={connectMetaMask}
                disabled={isConnecting}
                className="w-full h-12 text-lg"
                size="lg"
              >
                <Wallet className="h-5 w-5 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Don't have MetaMask?
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download MetaMask
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>Secure wallet authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span>Access to Web3 features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                <span>Create and vote on polls</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
