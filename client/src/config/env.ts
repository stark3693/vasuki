// Environment configuration for Vasukii Prediction Polls
// Copy this to .env in the root directory and update the values

export const ENV_CONFIG = {
  // Web3 Configuration
  WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
  VSK_TOKEN_ADDRESS: import.meta.env.VITE_VSK_TOKEN_ADDRESS || '0x5CB7681Ce38c8bD8089DEd49E0B585596b423B1C',
  PREDICTION_POLL_ADDRESS: import.meta.env.VITE_PREDICTION_POLL_ADDRESS || '',
  
  // Development settings
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;

// Helper function to check if contracts are configured
export const isWeb3Configured = () => {
  return !!(
    ENV_CONFIG.VSK_TOKEN_ADDRESS && 
    ENV_CONFIG.PREDICTION_POLL_ADDRESS &&
    ENV_CONFIG.WALLET_CONNECT_PROJECT_ID
  );
};

// Helper function to check if WalletConnect is configured
export const isWalletConnectConfigured = () => {
  return !!(ENV_CONFIG.WALLET_CONNECT_PROJECT_ID && ENV_CONFIG.WALLET_CONNECT_PROJECT_ID !== '');
};

// Default contract addresses for development (these would be updated after deployment)
export const DEFAULT_CONTRACT_ADDRESSES = {
  // These addresses should be updated after deploying the contracts
  VSK_TOKEN: '0x0000000000000000000000000000000000000000',
  PREDICTION_POLL: '0x0000000000000000000000000000000000000000',
} as const;
