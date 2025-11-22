import { vaskDNASystem } from './vask-dna-system';

// Vask Time Capsules - Frontend Integration
export interface TimeCapsuleData {
  id: string;
  content: string;
  unlockType: 'time' | 'price' | 'witness';
  unlockConditions: UnlockConditions;
  stakeAmount: number;
  createdAt: Date;
  isUnlocked: boolean;
  creator: string;
  witnesses?: string[];
  witnessThreshold?: number;
  currentWitnessCount?: number;
}

export interface UnlockConditions {
  unlockTime?: Date;
  priceTarget?: number;
  priceToken?: string;
  currentPrice?: number;
  blockTarget?: number;
  customConditions?: string;
}

export interface CreateCapsuleData {
  content: string;
  unlockType: 'time' | 'price' | 'witness';
  stakeAmount: number;
  unlockTime?: Date;
  priceTarget?: number;
  priceToken?: string;
  witnesses?: string[];
  witnessThreshold?: number;
}

export interface CapsuleStatus {
  canUnlock: boolean;
  reason?: string;
  timeRemaining?: number;
  priceProgress?: number;
  witnessProgress?: number;
}

export class VaskTimeCapsules {
  private static instance: VaskTimeCapsules;
  private capsules: Map<string, TimeCapsuleData> = new Map();
  private priceFeed: Map<string, number> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): VaskTimeCapsules {
    if (!VaskTimeCapsules.instance) {
      VaskTimeCapsules.instance = new VaskTimeCapsules();
    }
    return VaskTimeCapsules.instance;
  }

  constructor() {
    this.initializePriceFeed();
    this.startPriceUpdates();
  }

  // Create a new time capsule
  async createTimeCapsule(data: CreateCapsuleData, userAddress: string): Promise<TimeCapsuleData> {
    const capsuleId = this.generateCapsuleId();
    
    // Validate data
    this.validateCapsuleData(data);
    
    // Generate DNA for the capsule content
    const contentDNA = vaskDNASystem.generateDNA(data.content, {}, {
      chainId: 1,
      blockNumber: Date.now(),
      timestamp: Date.now()
    });

    const unlockConditions: UnlockConditions = {};
    
    switch (data.unlockType) {
      case 'time':
        if (!data.unlockTime) throw new Error('Unlock time required for time-based capsules');
        unlockConditions.unlockTime = data.unlockTime;
        break;
      case 'price':
        if (!data.priceTarget || !data.priceToken) {
          throw new Error('Price target and token required for price-based capsules');
        }
        unlockConditions.priceTarget = data.priceTarget;
        unlockConditions.priceToken = data.priceToken;
        unlockConditions.currentPrice = this.priceFeed.get(data.priceToken) || 0;
        break;
      case 'witness':
        if (!data.witnesses || !data.witnessThreshold) {
          throw new Error('Witnesses and threshold required for witness-based capsules');
        }
        unlockConditions.customConditions = `${data.witnessThreshold} witnesses required`;
        break;
    }

    const capsule: TimeCapsuleData = {
      id: capsuleId,
      content: data.content,
      unlockType: data.unlockType,
      unlockConditions,
      stakeAmount: data.stakeAmount,
      createdAt: new Date(),
      isUnlocked: false,
      creator: userAddress,
      witnesses: data.witnesses,
      witnessThreshold: data.witnessThreshold,
      currentWitnessCount: 0
    };

    this.capsules.set(capsuleId, capsule);
    
    // Emit creation event
    this.emit('capsuleCreated', capsule);
    
    // Start monitoring for unlock conditions
    this.monitorCapsule(capsuleId);
    
    return capsule;
  }

  // Get capsule by ID
  getCapsule(capsuleId: string): TimeCapsuleData | undefined {
    return this.capsules.get(capsuleId);
  }

  // Get all capsules for a user
  getUserCapsules(userAddress: string): TimeCapsuleData[] {
    return Array.from(this.capsules.values())
      .filter(capsule => capsule.creator === userAddress);
  }

  // Get all public capsules
  getAllPublicCapsules(): TimeCapsuleData[] {
    return Array.from(this.capsules.values())
      .filter(capsule => !capsule.isUnlocked)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Check if capsule can be unlocked
  checkCapsuleStatus(capsuleId: string): CapsuleStatus {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule || capsule.isUnlocked) {
      return { canUnlock: false };
    }

    const now = new Date();
    
    switch (capsule.unlockType) {
      case 'time':
        const unlockTime = capsule.unlockConditions.unlockTime;
        if (!unlockTime) return { canUnlock: false };
        
        const canUnlock = now >= unlockTime;
        const timeRemaining = canUnlock ? 0 : unlockTime.getTime() - now.getTime();
        
        return {
          canUnlock,
          timeRemaining,
          reason: canUnlock ? 'Time condition met' : `${this.formatTimeRemaining(timeRemaining)} remaining`
        };

      case 'price':
        const priceTarget = capsule.unlockConditions.priceTarget || 0;
        const currentPrice = this.priceFeed.get(capsule.unlockConditions.priceToken || '') || 0;
        const canUnlockPrice = currentPrice >= priceTarget;
        const priceProgress = priceTarget > 0 ? (currentPrice / priceTarget) * 100 : 0;
        
        return {
          canUnlock: canUnlockPrice,
          priceProgress,
          reason: canUnlockPrice 
            ? `Price target reached: $${currentPrice.toFixed(2)}`
            : `Price progress: ${priceProgress.toFixed(1)}% ($${currentPrice.toFixed(2)} / $${priceTarget.toFixed(2)})`
        };

      case 'witness':
        const witnessCount = capsule.currentWitnessCount || 0;
        const threshold = capsule.witnessThreshold || 0;
        const canUnlockWitness = witnessCount >= threshold;
        const witnessProgress = threshold > 0 ? (witnessCount / threshold) * 100 : 0;
        
        return {
          canUnlock: canUnlockWitness,
          witnessProgress,
          reason: canUnlockWitness
            ? `Witness threshold reached: ${witnessCount}/${threshold}`
            : `Witness progress: ${witnessCount}/${threshold} (${witnessProgress.toFixed(1)}%)`
        };

      default:
        return { canUnlock: false };
    }
  }

  // Unlock a capsule
  async unlockCapsule(capsuleId: string): Promise<boolean> {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) {
      throw new Error('Capsule not found');
    }

    const status = this.checkCapsuleStatus(capsuleId);
    if (!status.canUnlock) {
      throw new Error(`Capsule cannot be unlocked: ${status.reason}`);
    }

    // Mark as unlocked
    capsule.isUnlocked = true;
    
    // Emit unlock event
    this.emit('capsuleUnlocked', { capsule, reason: status.reason });
    
    return true;
  }

  // Add witness to a capsule
  async addWitness(capsuleId: string, witnessAddress: string): Promise<boolean> {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) {
      throw new Error('Capsule not found');
    }

    if (capsule.unlockType !== 'witness') {
      throw new Error('Not a witness-based capsule');
    }

    if (!capsule.witnesses?.includes(witnessAddress)) {
      throw new Error('Address not authorized to witness this capsule');
    }

    if (capsule.isUnlocked) {
      throw new Error('Capsule already unlocked');
    }

    // Increment witness count
    capsule.currentWitnessCount = (capsule.currentWitnessCount || 0) + 1;
    
    // Emit witness event
    this.emit('witnessAdded', { capsule, witnessAddress });
    
    // Check if capsule can now be unlocked
    const status = this.checkCapsuleStatus(capsuleId);
    if (status.canUnlock) {
      this.emit('capsuleReadyToUnlock', { capsule, status });
    }
    
    return true;
  }

  // Get trending capsules (most anticipated)
  getTrendingCapsules(): TimeCapsuleData[] {
    return Array.from(this.capsules.values())
      .filter(capsule => !capsule.isUnlocked)
      .map(capsule => ({
        capsule,
        anticipationScore: this.calculateAnticipationScore(capsule)
      }))
      .sort((a, b) => b.anticipationScore - a.anticipationScore)
      .map(item => item.capsule);
  }

  // Get capsules nearing unlock
  getNearingUnlockCapsules(): TimeCapsuleData[] {
    return Array.from(this.capsules.values())
      .filter(capsule => !capsule.isUnlocked)
      .map(capsule => ({
        capsule,
        timeToUnlock: this.getTimeToUnlock(capsule)
      }))
      .filter(item => item.timeToUnlock > 0 && item.timeToUnlock < 7 * 24 * 60 * 60 * 1000) // Within 7 days
      .sort((a, b) => a.timeToUnlock - b.timeToUnlock)
      .map(item => item.capsule);
  }

  // Event system
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods
  private validateCapsuleData(data: CreateCapsuleData): void {
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Content is required');
    }

    if (data.stakeAmount <= 0) {
      throw new Error('Stake amount must be greater than 0');
    }

    switch (data.unlockType) {
      case 'time':
        if (!data.unlockTime || data.unlockTime <= new Date()) {
          throw new Error('Valid future unlock time is required');
        }
        break;
      case 'price':
        if (!data.priceTarget || data.priceTarget <= 0) {
          throw new Error('Valid price target is required');
        }
        if (!data.priceToken || !this.priceFeed.has(data.priceToken)) {
          throw new Error('Valid price token is required');
        }
        break;
      case 'witness':
        if (!data.witnesses || data.witnesses.length === 0) {
          throw new Error('At least one witness is required');
        }
        if (!data.witnessThreshold || data.witnessThreshold <= 0 || data.witnessThreshold > data.witnesses.length) {
          throw new Error('Valid witness threshold is required');
        }
        break;
    }
  }

  private monitorCapsule(capsuleId: string): void {
    // Check every minute for unlock conditions
    const interval = setInterval(() => {
      const capsule = this.capsules.get(capsuleId);
      if (!capsule || capsule.isUnlocked) {
        clearInterval(interval);
        return;
      }

      const status = this.checkCapsuleStatus(capsuleId);
      if (status.canUnlock) {
        this.emit('capsuleReadyToUnlock', { capsule, status });
      }
    }, 60000); // Check every minute
  }

  private initializePriceFeed(): void {
    // Initialize with some common crypto prices (mock data)
    this.priceFeed.set('BTC', 45000);
    this.priceFeed.set('ETH', 3000);
    this.priceFeed.set('SOL', 100);
    this.priceFeed.set('MATIC', 0.8);
    this.priceFeed.set('BNB', 300);
    this.priceFeed.set('ADA', 0.5);
    this.priceFeed.set('DOT', 7);
    this.priceFeed.set('LINK', 15);
  }

  private startPriceUpdates(): void {
    // Simulate price updates every 30 seconds
    setInterval(() => {
      for (const [token, price] of this.priceFeed) {
        // Simulate price volatility (±5%)
        const volatility = (Math.random() - 0.5) * 0.1;
        const newPrice = price * (1 + volatility);
        this.priceFeed.set(token, Math.max(0.01, newPrice));
      }
      
      this.emit('pricesUpdated', Object.fromEntries(this.priceFeed));
    }, 30000);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  private generateCapsuleId(): string {
    return `capsule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  private calculateAnticipationScore(capsule: TimeCapsuleData): number {
    let score = 0;
    
    // Base score from stake amount
    score += Math.min(100, capsule.stakeAmount / 100);
    
    // Time-based capsules get higher scores if they're unlocking soon
    if (capsule.unlockType === 'time' && capsule.unlockConditions.unlockTime) {
      const timeToUnlock = capsule.unlockConditions.unlockTime.getTime() - Date.now();
      if (timeToUnlock > 0 && timeToUnlock < 24 * 60 * 60 * 1000) {
        score += 50; // Bonus for unlocking within 24 hours
      }
    }
    
    // Price-based capsules get higher scores if close to target
    if (capsule.unlockType === 'price') {
      const priceTarget = capsule.unlockConditions.priceTarget || 0;
      const currentPrice = this.priceFeed.get(capsule.unlockConditions.priceToken || '') || 0;
      const progress = priceTarget > 0 ? (currentPrice / priceTarget) * 100 : 0;
      score += Math.min(50, progress * 0.5); // Up to 50 bonus points for price progress
    }
    
    // Witness-based capsules get higher scores if close to threshold
    if (capsule.unlockType === 'witness') {
      const witnessCount = capsule.currentWitnessCount || 0;
      const threshold = capsule.witnessThreshold || 1;
      const progress = threshold > 0 ? (witnessCount / threshold) * 100 : 0;
      score += Math.min(50, progress * 0.5); // Up to 50 bonus points for witness progress
    }
    
    return score;
  }

  private getTimeToUnlock(capsule: TimeCapsuleData): number {
    if (capsule.unlockType === 'time' && capsule.unlockConditions.unlockTime) {
      return capsule.unlockConditions.unlockTime.getTime() - Date.now();
    }
    return 0;
  }
}

// Export singleton instance
export const vaskTimeCapsules = VaskTimeCapsules.getInstance();

