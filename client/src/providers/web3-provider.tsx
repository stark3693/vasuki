import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config, SUPPORTED_CHAINS } from '../lib/web3-config';
import { isWalletConnectConfigured } from '../config/env';
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // Only initialize Web3 providers if WalletConnect is configured and config exists
  if (!isWalletConnectConfigured() || !config) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        chains={SUPPORTED_CHAINS}
        modalSize="compact"
        showRecentTransactions={true}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
