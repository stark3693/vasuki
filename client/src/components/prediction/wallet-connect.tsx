import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Wallet, Coins, Shield, AlertTriangle } from 'lucide-react';
import { isWalletConnectConfigured } from '../../config/env';

interface WalletConnectProps {
  onConnect?: () => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const isConfigured = isWalletConnectConfigured();

  // Show configuration error if Web3 is not properly set up
  if (!isConfigured) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle>Web3 Not Configured</CardTitle>
          <CardDescription>
            Wallet connection requires Web3 configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Required:</strong> To enable wallet connection, you need to:
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>Get a WalletConnect Project ID from <a href="https://cloud.walletconnect.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">cloud.walletconnect.com</a></li>
                <li>Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the root directory</li>
                <li>Add: <code className="bg-gray-100 px-1 rounded">VITE_WALLET_CONNECT_PROJECT_ID=your_project_id</code></li>
                <li>Restart the development server</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>Stake VSK tokens when voting</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure and decentralized voting</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Connect your wallet to participate in prediction polls and stake VSK tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span>Stake VSK tokens when voting</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure and decentralized voting</span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button onClick={openConnectModal} className="w-full">
                          <Wallet className="h-4 w-4 mr-2" />
                          Connect Wallet
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button onClick={openChainModal} variant="destructive" className="w-full">
                          Wrong Network
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={openChainModal}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                overflow: 'hidden',
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  style={{ width: 12, height: 12 }}
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </Button>

                        <Button onClick={openAccountModal} variant="outline">
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ''}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </CardContent>
    </Card>
  );
}
