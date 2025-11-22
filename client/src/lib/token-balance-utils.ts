import { CONTRACT_ADDRESSES } from './web3-config';
import { vskTokenSystem } from './vsk-token-system';

/**
 * Utility function to get token balance with proper error handling
 */
export async function getTokenBalanceSafe(
  tokenAddress: string, 
  userAddress: string
): Promise<string> {
  try {
    // For VSK token, use the local balance system
    if (tokenAddress === CONTRACT_ADDRESSES.VSK_TOKEN) {
      const balance = vskTokenSystem.getBalance(userAddress);
      return balance.toString();
    }
    
    // For other tokens, return 0 for now (would need Web3 integration)
    console.warn(`Token balance not available for ${tokenAddress} in non-Web3 mode`);
    return '0';
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
}

/**
 * Check if a token address is valid
 */
export function isValidTokenAddress(address: string): boolean {
  return Boolean(address && address !== '0x0000000000000000000000000000000000000000' && address.startsWith('0x'));
}

/**
 * Get token symbol from address
 */
export function getTokenSymbol(tokenAddress: string): string {
  if (tokenAddress === CONTRACT_ADDRESSES.VSK_TOKEN) {
    return 'VSK';
  }
  return 'UNKNOWN';
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: string, decimals: number = 18): string {
  try {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    
    // Format with appropriate decimal places
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(2);
    if (num < 1000) return num.toFixed(1);
    return num.toLocaleString();
  } catch (error) {
    console.error('Error formatting token balance:', error);
    return '0.00';
  }
}
