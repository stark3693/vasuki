import { vaskDNASystem } from './vask-dna-system';

// Vask Holographic Posts - World's First Multi-Dimensional Content System
export interface HolographicPost {
  id: string;
  creator: string;
  dimensions: ContentDimension[];
  activeDimension: string;
  dimensionHistory: DimensionSwitch[];
  createdAt: Date;
  lastModified: Date;
  totalViews: number;
  dimensionViews: Map<string, number>;
  dna: string; // Reference to DNA system
}

export interface ContentDimension {
  id: string;
  type: DimensionType;
  name: string;
  content: DimensionContent;
  isActive: boolean;
  unlockConditions?: UnlockConditions;
  createdAt: Date;
  viewCount: number;
  interactionCount: number;
  metadata?: {
    theme?: string;
    mood?: string;
    intensity?: number;
    complexity?: number;
    accessibility?: string;
  };
}

export interface DimensionContent {
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
  interactive?: InteractiveContent;
  metadata: DimensionMetadata;
}

export interface InteractiveContent {
  type: 'quiz' | 'poll' | 'game' | 'simulation' | 'ar' | 'vr';
  data: any;
  interactions: UserInteraction[];
}

export interface UserInteraction {
  userId: string;
  interactionType: string;
  data: any;
  timestamp: Date;
}

export interface DimensionMetadata {
  theme: string;
  mood: string;
  intensity: number; // 0-100
  complexity: number; // 0-100
  accessibility: AccessibilityLevel;
  requiredTokens?: number;
  unlockTime?: Date;
  blockchainRequirements?: BlockchainRequirement[];
}

export interface BlockchainRequirement {
  chainId: string;
  tokenAddress: string;
  minBalance: number;
  nftRequirement?: string;
}

export interface UnlockConditions {
  type: 'time' | 'token' | 'interaction' | 'blockchain' | 'custom';
  conditions: any;
  description: string;
}

export interface DimensionSwitch {
  fromDimension: string;
  toDimension: string;
  timestamp: Date;
  userId: string;
  reason: string;
}

export type DimensionType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'interactive'
  | 'simulation' 
  | 'ar' 
  | 'vr' 
  | 'blockchain' 
  | 'nft' 
  | 'game';

export type AccessibilityLevel = 'public' | 'premium' | 'exclusive' | 'private';

export class VaskHolographicPosts {
  private static instance: VaskHolographicPosts;
  private posts: Map<string, HolographicPost> = new Map();
  private dimensionRegistry: Map<string, DimensionType[]> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): VaskHolographicPosts {
    if (!VaskHolographicPosts.instance) {
      VaskHolographicPosts.instance = new VaskHolographicPosts();
    }
    return VaskHolographicPosts.instance;
  }

  constructor() {
    this.initializeDimensionRegistry();
  }

  // Create a new holographic post
  async createHolographicPost(
    creator: string,
    initialDimension: DimensionContent,
    dimensionType: DimensionType = 'text'
  ): Promise<HolographicPost> {
    const postId = this.generatePostId();
    
    // Generate DNA for the post
    const dna = vaskDNASystem.generateDNA(
      initialDimension.text || 'Multi-dimensional post',
      {},
      { chainId: 1, blockNumber: Date.now(), timestamp: Date.now() }
    );

    const firstDimension: ContentDimension = {
      id: this.generateDimensionId(),
      type: dimensionType,
      name: this.getDimensionName(dimensionType),
      content: initialDimension,
      isActive: true,
      createdAt: new Date(),
      viewCount: 0,
      interactionCount: 0,
      metadata: {
        theme: this.detectTheme(initialDimension),
        mood: this.detectMood(initialDimension),
        intensity: this.calculateIntensity(initialDimension),
        complexity: this.calculateComplexity(initialDimension),
        accessibility: 'public'
      }
    };

    const holographicPost: HolographicPost = {
      id: postId,
      creator,
      dimensions: [firstDimension],
      activeDimension: firstDimension.id,
      dimensionHistory: [],
      createdAt: new Date(),
      lastModified: new Date(),
      totalViews: 0,
      dimensionViews: new Map([[firstDimension.id, 0]]),
      dna: dna.id
    };

    this.posts.set(postId, holographicPost);
    this.emit('postCreated', holographicPost);
    
    return holographicPost;
  }

  // Add a new dimension to an existing post
  async addDimension(
    postId: string,
    dimensionContent: DimensionContent,
    dimensionType: DimensionType,
    unlockConditions?: UnlockConditions
  ): Promise<ContentDimension> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Holographic post not found');
    }

    const newDimension: ContentDimension = {
      id: this.generateDimensionId(),
      type: dimensionType,
      name: this.getDimensionName(dimensionType),
      content: dimensionContent,
      isActive: false,
      unlockConditions,
      createdAt: new Date(),
      viewCount: 0,
      interactionCount: 0,
      metadata: {
        theme: this.detectTheme(dimensionContent),
        mood: this.detectMood(dimensionContent),
        intensity: this.calculateIntensity(dimensionContent),
        complexity: this.calculateComplexity(dimensionContent),
        accessibility: unlockConditions ? 'premium' : 'public'
      }
    };

    post.dimensions.push(newDimension);
    post.dimensionViews.set(newDimension.id, 0);
    post.lastModified = new Date();

    this.emit('dimensionAdded', { post, dimension: newDimension });
    return newDimension;
  }

  // Switch to a different dimension
  async switchDimension(
    postId: string,
    dimensionId: string,
    userId: string,
    reason: string = 'User navigation'
  ): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Holographic post not found');
    }

    const targetDimension = post.dimensions.find(d => d.id === dimensionId);
    if (!targetDimension) {
      throw new Error('Dimension not found');
    }

    // Check unlock conditions
    if (targetDimension.unlockConditions) {
      const canUnlock = await this.checkUnlockConditions(targetDimension.unlockConditions, userId);
      if (!canUnlock) {
        throw new Error('Dimension unlock conditions not met');
      }
    }

    // Deactivate current dimension
    const currentDimension = post.dimensions.find(d => d.id === post.activeDimension);
    if (currentDimension) {
      currentDimension.isActive = false;
    }

    // Activate target dimension
    targetDimension.isActive = true;
    post.activeDimension = dimensionId;
    post.lastModified = new Date();

    // Record dimension switch
    const dimensionSwitch: DimensionSwitch = {
      fromDimension: currentDimension?.id || '',
      toDimension: dimensionId,
      timestamp: new Date(),
      userId,
      reason
    };
    post.dimensionHistory.push(dimensionSwitch);

    // Update view counts
    targetDimension.viewCount++;
    post.totalViews++;
    post.dimensionViews.set(dimensionId, (post.dimensionViews.get(dimensionId) || 0) + 1);

    this.emit('dimensionSwitched', { post, switch: dimensionSwitch });
    return true;
  }

  // Get current dimension content
  getCurrentDimension(postId: string): ContentDimension | null {
    const post = this.posts.get(postId);
    if (!post) return null;

    return post.dimensions.find(d => d.id === post.activeDimension) || null;
  }

  // Get all dimensions for a post
  getPostDimensions(postId: string): ContentDimension[] {
    const post = this.posts.get(postId);
    return post ? post.dimensions : [];
  }

  // Interact with current dimension
  async interactWithDimension(
    postId: string,
    userId: string,
    interactionType: string,
    interactionData: any
  ): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    const currentDimension = this.getCurrentDimension(postId);
    if (!currentDimension) return false;

    // Add interaction
    if (currentDimension.content.interactive) {
      const interaction: UserInteraction = {
        userId,
        interactionType,
        data: interactionData,
        timestamp: new Date()
      };
      currentDimension.content.interactive.interactions.push(interaction);
      currentDimension.interactionCount++;
    }

    this.emit('dimensionInteraction', { post, dimension: currentDimension, interaction: { userId, interactionType, interactionData } });
    return true;
  }

  // Get holographic post by ID
  getHolographicPost(postId: string): HolographicPost | undefined {
    return this.posts.get(postId);
  }

  // Get all holographic posts
  getAllHolographicPosts(): HolographicPost[] {
    return Array.from(this.posts.values());
  }

  // Get posts by creator
  getPostsByCreator(creator: string): HolographicPost[] {
    return Array.from(this.posts.values())
      .filter(post => post.creator === creator);
  }

  // Get trending holographic posts
  getTrendingHolographicPosts(): HolographicPost[] {
    return Array.from(this.posts.values())
      .map(post => ({
        post,
        trendScore: this.calculateTrendScore(post)
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .map(item => item.post);
  }

  // Get posts with specific dimension type
  getPostsByDimensionType(dimensionType: DimensionType): HolographicPost[] {
    return Array.from(this.posts.values())
      .filter(post => post.dimensions.some(d => d.type === dimensionType));
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
  private initializeDimensionRegistry(): void {
    // Register available dimension types and their combinations
    this.dimensionRegistry.set('text', ['text', 'image', 'video', 'audio', 'interactive']);
    this.dimensionRegistry.set('image', ['image', 'text', 'video', 'ar', 'interactive']);
    this.dimensionRegistry.set('video', ['video', 'text', 'image', 'audio', 'vr']);
    this.dimensionRegistry.set('audio', ['audio', 'text', 'image', 'interactive']);
    this.dimensionRegistry.set('interactive', ['interactive', 'text', 'image', 'game', 'simulation']);
    this.dimensionRegistry.set('ar', ['ar', 'image', 'interactive', 'text']);
    this.dimensionRegistry.set('vr', ['vr', 'video', 'interactive', 'text']);
    this.dimensionRegistry.set('blockchain', ['blockchain', 'nft', 'text', 'interactive']);
    this.dimensionRegistry.set('nft', ['nft', 'image', 'blockchain', 'text']);
    this.dimensionRegistry.set('game', ['game', 'interactive', 'text', 'image']);
  }

  private async checkUnlockConditions(
    unlockConditions: UnlockConditions,
    userId: string
  ): Promise<boolean> {
    switch (unlockConditions.type) {
      case 'time':
        return new Date() >= unlockConditions.conditions.unlockTime;
      case 'token':
        // Check if user has required tokens
        return true; // Simplified for now
      case 'interaction':
        // Check if user has performed required interactions
        return true; // Simplified for now
      case 'blockchain':
        // Check blockchain requirements
        return true; // Simplified for now
      case 'custom':
        // Custom unlock logic
        return true; // Simplified for now
      default:
        return false;
    }
  }

  private detectTheme(content: DimensionContent): string {
    if (content.text) {
      const text = content.text.toLowerCase();
      if (text.includes('crypto') || text.includes('blockchain')) return 'crypto';
      if (text.includes('art') || text.includes('creative')) return 'art';
      if (text.includes('tech') || text.includes('technology')) return 'technology';
      if (text.includes('game') || text.includes('gaming')) return 'gaming';
      if (text.includes('music') || text.includes('audio')) return 'music';
    }
    return 'general';
  }

  private detectMood(content: DimensionContent): string {
    if (content.text) {
      const text = content.text.toLowerCase();
      if (text.includes('excited') || text.includes('amazing')) return 'excited';
      if (text.includes('sad') || text.includes('disappointed')) return 'melancholic';
      if (text.includes('fun') || text.includes('lol')) return 'playful';
      if (text.includes('serious') || text.includes('important')) return 'serious';
    }
    return 'neutral';
  }

  private calculateIntensity(content: DimensionContent): number {
    let intensity = 0;
    
    if (content.text) {
      const text = content.text.toLowerCase();
      const intenseWords = ['amazing', 'incredible', 'revolutionary', 'breakthrough', 'epic'];
      intensity += intenseWords.filter(word => text.includes(word)).length * 20;
    }
    
    if (content.video) intensity += 30;
    if (content.audio) intensity += 20;
    if (content.interactive) intensity += 40;
    
    return Math.min(100, intensity);
  }

  private calculateComplexity(content: DimensionContent): number {
    let complexity = 0;
    
    if (content.text) {
      const wordCount = content.text.split(' ').length;
      complexity += Math.min(50, wordCount / 10);
    }
    
    if (content.interactive) complexity += 30;
    if (content.video) complexity += 20;
    if (content.audio) complexity += 15;
    
    return Math.min(100, complexity);
  }

  private getDimensionName(dimensionType: DimensionType): string {
    const names: Record<DimensionType, string> = {
      'text': 'Text Dimension',
      'image': 'Visual Dimension',
      'video': 'Video Dimension',
      'audio': 'Audio Dimension',
      'interactive': 'Interactive Dimension',
      'ar': 'AR Dimension',
      'vr': 'VR Dimension',
      'blockchain': 'Blockchain Dimension',
      'nft': 'NFT Dimension',
      'game': 'Game Dimension'
    };
    return names[dimensionType];
  }

  private calculateTrendScore(post: HolographicPost): number {
    let score = 0;
    
    // Base score from total views
    score += Math.min(50, post.totalViews / 10);
    
    // Bonus for multiple dimensions
    score += Math.min(30, post.dimensions.length * 5);
    
    // Bonus for recent activity
    const hoursSinceLastModified = (Date.now() - post.lastModified.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastModified < 24) {
      score += 20;
    }
    
    // Bonus for high interaction dimensions
    const avgInteractions = post.dimensions.reduce((sum, dim) => sum + dim.interactionCount, 0) / post.dimensions.length;
    score += Math.min(20, avgInteractions / 5);
    
    return score;
  }

  private generatePostId(): string {
    return `holographic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateDimensionId(): string {
    return `dimension_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}

// Export singleton instance
export const vaskHolographicPosts = VaskHolographicPosts.getInstance();

