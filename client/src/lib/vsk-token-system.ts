import { ENV_CONFIG } from '../config/env';

// VSK Token Balance Interface
export interface VSKBalance {
  address: string;
  balance: number;
  stakedBalance: number;
  lastUpdated: number;
}

// VSK Token System for managing user balances
export class VSKTokenSystem {
  private static instance: VSKTokenSystem;
  private balances: Map<string, VSKBalance> = new Map();
  private readonly INITIAL_BALANCE = 1000; // Give every user 1000 VSK tokens
  private readonly STORAGE_KEY = 'vasukii_vsk_balances';

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): VSKTokenSystem {
    if (!VSKTokenSystem.instance) {
      VSKTokenSystem.instance = new VSKTokenSystem();
    }
    return VSKTokenSystem.instance;
  }

  // Load balances from localStorage
  private loadFromStorage(): void {
    try {
      const storedBalances = localStorage.getItem(this.STORAGE_KEY);
      if (storedBalances) {
        const balancesArray = JSON.parse(storedBalances) as VSKBalance[];
        this.balances = new Map(balancesArray.map(balance => [balance.address, balance]));
      }
    } catch (error) {
      console.error('Error loading VSK balances from storage:', error);
    }
  }

  // Save balances to localStorage (public for external updates)
  saveToStorage(): void {
    try {
      const balancesArray = Array.from(this.balances.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(balancesArray));
    } catch (error) {
      console.error('Error saving VSK balances to storage:', error);
    }
  }

  // Get or create user balance (public for welcome token distribution)
  getUserBalance(address: string): VSKBalance {
    let balance = this.balances.get(address);
    
    if (!balance) {
      // Create new user with 1000 VSK tokens
      balance = {
        address,
        balance: this.INITIAL_BALANCE,
        stakedBalance: 0,
        lastUpdated: Date.now(),
      };
      this.balances.set(address, balance);
      this.saveToStorage();
      
      console.log(`🎉 New user ${address} received ${this.INITIAL_BALANCE} VSK tokens!`);
    }
    
    return balance;
  }

  // Get user's VSK balance
  getBalance(address: string): number {
    const balance = this.getUserBalance(address);
    return balance.balance;
  }

  // Get user's staked VSK balance
  getStakedBalance(address: string): number {
    const balance = this.getUserBalance(address);
    return balance.stakedBalance;
  }

  // Transfer VSK tokens (for voting/staking) - REMOVED DUPLICATE METHOD

  // Stake VSK tokens
  stake(address: string, amount: number): boolean {
    if (amount <= 0) return false;
    
    const balance = this.getUserBalance(address);
    if (balance.balance < amount) {
      console.error(`Insufficient VSK balance to stake: ${balance.balance} < ${amount}`);
      return false;
    }

    // Move tokens from balance to staked
    balance.balance -= amount;
    balance.stakedBalance += amount;
    balance.lastUpdated = Date.now();

    this.saveToStorage();
    console.log(`💰 User ${address} staked ${amount} VSK tokens`);
    return true;
  }

  // Unstake VSK tokens
  unstake(address: string, amount: number): boolean {
    if (amount <= 0) return false;
    
    const balance = this.getUserBalance(address);
    if (balance.stakedBalance < amount) {
      console.error(`Insufficient staked VSK balance: ${balance.stakedBalance} < ${amount}`);
      return false;
    }

    // Move tokens from staked back to balance
    balance.stakedBalance -= amount;
    balance.balance += amount;
    balance.lastUpdated = Date.now();

    this.saveToStorage();
    console.log(`🔄 User ${address} unstaked ${amount} VSK tokens`);
    return true;
  }

  // Deduct tokens for voting (transfers to contract)
  deductTokens(address: string, amount: number): boolean {
    if (amount <= 0) return false;
    
    const balance = this.getUserBalance(address);
    if (balance.balance < amount) {
      console.error(`Insufficient VSK balance to deduct: ${balance.balance} < ${amount}`);
      return false;
    }

    // Deduct tokens from user balance (transfer to contract)
    balance.balance -= amount;
    balance.lastUpdated = Date.now();

    this.saveToStorage();
    console.log(`🗳️ User ${address} used ${amount} VSK tokens for voting`);
    return true;
  }

  // Transfer tokens between addresses or to/from contract
  transfer(from: string, to: string, amount: number): boolean {
    if (amount <= 0) return false;
    
    if (from === 'contract') {
      // Mint new tokens (for rewards)
      if (to !== 'contract') {
        const toBalance = this.getUserBalance(to);
        toBalance.balance += amount;
        toBalance.lastUpdated = Date.now();
        this.saveToStorage();
        console.log(`💰 Contract transferred ${amount} VSK tokens to ${to}`);
        return true;
      }
      return false;
    }
    
    const fromBalance = this.getUserBalance(from);
    if (fromBalance.balance < amount) {
      console.error(`Insufficient VSK balance: ${fromBalance.balance} < ${amount}`);
      return false;
    }

    // Deduct from sender
    fromBalance.balance -= amount;
    fromBalance.lastUpdated = Date.now();

    // Add to recipient (or burn if to contract)
    if (to !== 'contract') {
      const toBalance = this.getUserBalance(to);
      toBalance.balance += amount;
      toBalance.lastUpdated = Date.now();
    }

    this.saveToStorage();
    console.log(`🔄 Transferred ${amount} VSK tokens from ${from} to ${to}`);
    return true;
  }

  // Approve tokens for contract (always returns true for demo)
  approve(address: string, spender: string, amount: number): boolean {
    console.log(`✅ User ${address} approved ${amount} VSK tokens for ${spender}`);
    return true;
  }

  // Check allowance (always returns the amount for demo)
  allowance(owner: string, spender: string): number {
    const balance = this.getUserBalance(owner);
    return balance.balance; // Allow spending all available tokens
  }

  // Get all balances (for admin/debugging)
  getAllBalances(): VSKBalance[] {
    return Array.from(this.balances.values());
  }

  // Clear all balances (for testing)
  clearAllBalances(): void {
    this.balances.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Distribute tokens to users (admin function)
  distributeTokens(recipients: string[], amountPerUser: number): boolean {
    if (recipients.length === 0 || amountPerUser <= 0) return false;
    
    console.log(`🎁 Distributing ${amountPerUser} VSK tokens to ${recipients.length} users`);
    
    for (const recipient of recipients) {
      const balance = this.getUserBalance(recipient);
      balance.balance += amountPerUser;
      balance.lastUpdated = Date.now();
      console.log(`💰 Distributed ${amountPerUser} VSK to ${recipient}`);
    }
    
    this.saveToStorage();
    return true;
  }

  // Get all user addresses for distribution
  getAllUserAddresses(): string[] {
    return Array.from(this.balances.keys());
  }

  // Get distribution statistics
  getDistributionStats() {
    const addresses = this.getAllUserAddresses();
    return {
      totalUsers: addresses.length,
      totalTokens: addresses.reduce((sum, addr) => sum + this.getBalance(addr), 0),
      averageBalance: addresses.length > 0 ? addresses.reduce((sum, addr) => sum + this.getBalance(addr), 0) / addresses.length : 0,
    };
  }

  // Get token info
  getTokenInfo() {
    return {
      address: ENV_CONFIG.VSK_TOKEN_ADDRESS,
      name: 'Vasukii Token',
      symbol: 'VSK',
      decimals: 18,
      totalSupply: this.balances.size * this.INITIAL_BALANCE,
      initialBalance: this.INITIAL_BALANCE,
    };
  }
}

// Export singleton instance
export const vskTokenSystem = VSKTokenSystem.getInstance();
