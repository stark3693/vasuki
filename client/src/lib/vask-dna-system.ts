import CryptoJS from 'crypto-js';

// Vask DNA Evolution System - World's First Content Genetic Algorithm
export interface VaskDNA {
  id: string;
  contentHash: string;
  engagementScore: number;
  blockchainFingerprint: string;
  parentDNA?: string[];
  generation: number;
  traits: DNATraits;
  createdAt: Date;
  evolutionHistory: EvolutionEvent[];
}

export interface DNATraits {
  virality: number;        // 0-100: How likely to go viral
  longevity: number;       // 0-100: How long content stays relevant
  controversy: number;     // 0-100: Controversy level
  technicality: number;    // 0-100: Technical complexity
  creativity: number;      // 0-100: Creative expression
  authenticity: number;    // 0-100: Authentic voice
  blockchainRelevance: number; // 0-100: Web3/crypto relevance
}

export interface EvolutionEvent {
  type: 'mutation' | 'reproduction' | 'adaptation';
  timestamp: Date;
  description: string;
  parentDNA?: string;
  offspringDNA?: string;
  mutationFactor?: number;
}

export interface ReproductionResult {
  offspringDNA: VaskDNA;
  success: boolean;
  traits: DNATraits;
  evolutionNotes: string;
}

export class VaskDNASystem {
  private static instance: VaskDNASystem;
  private dnaRegistry: Map<string, VaskDNA> = new Map();
  private evolutionQueue: VaskDNA[] = [];

  static getInstance(): VaskDNASystem {
    if (!VaskDNASystem.instance) {
      VaskDNASystem.instance = new VaskDNASystem();
    }
    return VaskDNASystem.instance;
  }

  // Generate DNA for a new post
  generateDNA(content: string, engagementData: any, blockchainData: any): VaskDNA {
    const contentHash = this.createContentHash(content);
    const blockchainFingerprint = this.createBlockchainFingerprint(blockchainData);
    
    const dna: VaskDNA = {
      id: this.generateDNAId(),
      contentHash,
      engagementScore: this.calculateEngagementScore(engagementData),
      blockchainFingerprint,
      generation: 1,
      traits: this.analyzeContentTraits(content, engagementData),
      createdAt: new Date(),
      evolutionHistory: []
    };

    this.dnaRegistry.set(dna.id, dna);
    return dna;
  }

  // Breed two posts to create offspring
  reproduce(parentDNA1: string, parentDNA2: string): ReproductionResult {
    const parent1 = this.dnaRegistry.get(parentDNA1);
    const parent2 = this.dnaRegistry.get(parentDNA2);

    if (!parent1 || !parent2) {
      throw new Error('Parent DNA not found');
    }

    // Genetic crossover algorithm
    const offspringTraits = this.crossoverTraits(parent1.traits, parent2.traits);
    
    // Random mutations
    const mutatedTraits = this.applyMutations(offspringTraits);
    
    const offspringDNA: VaskDNA = {
      id: this.generateDNAId(),
      contentHash: this.createContentHash(`Offspring of ${parent1.id} and ${parent2.id}`),
      engagementScore: this.predictOffspringEngagement(parent1, parent2),
      blockchainFingerprint: this.combineBlockchainFingerprints(parent1, parent2),
      parentDNA: [parentDNA1, parentDNA2],
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      traits: mutatedTraits,
      createdAt: new Date(),
      evolutionHistory: [{
        type: 'reproduction',
        timestamp: new Date(),
        description: `Bred from ${parent1.id} and ${parent2.id}`,
        parentDNA: `${parentDNA1},${parentDNA2}`,
        offspringDNA: this.generateDNAId()
      }]
    };

    // Update parent evolution history
    parent1.evolutionHistory.push({
      type: 'reproduction',
      timestamp: new Date(),
      description: `Reproduced with ${parent2.id}`,
      offspringDNA: offspringDNA.id
    });

    parent2.evolutionHistory.push({
      type: 'reproduction',
      timestamp: new Date(),
      description: `Reproduced with ${parent1.id}`,
      offspringDNA: offspringDNA.id
    });

    this.dnaRegistry.set(offspringDNA.id, offspringDNA);

    return {
      offspringDNA,
      success: true,
      traits: mutatedTraits,
      evolutionNotes: this.generateEvolutionNotes(parent1, parent2, offspringDNA)
    };
  }

  // Evolve DNA based on new engagement data
  evolveDNA(dnaId: string, newEngagementData: any): VaskDNA {
    const dna = this.dnaRegistry.get(dnaId);
    if (!dna) {
      throw new Error('DNA not found');
    }

    const newTraits = this.adaptTraits(dna.traits, newEngagementData);
    const mutationFactor = this.calculateMutationFactor(newEngagementData);

    const evolvedDNA: VaskDNA = {
      ...dna,
      traits: newTraits,
      engagementScore: this.calculateEngagementScore(newEngagementData),
      evolutionHistory: [
        ...dna.evolutionHistory,
        {
          type: 'adaptation',
          timestamp: new Date(),
          description: `Adapted based on new engagement data`,
          mutationFactor
        }
      ]
    };

    this.dnaRegistry.set(dnaId, evolvedDNA);
    return evolvedDNA;
  }

  // Get DNA lineage (family tree)
  getDNALineage(dnaId: string, depth: number = 3): VaskDNA[] {
    const dna = this.dnaRegistry.get(dnaId);
    if (!dna) return [];

    const lineage: VaskDNA[] = [dna];
    
    if (dna.parentDNA && depth > 0) {
      for (const parentId of dna.parentDNA) {
        const parentLineage = this.getDNALineage(parentId, depth - 1);
        lineage.push(...parentLineage);
      }
    }

    return lineage;
  }

  // Find similar DNA (genetic relatives)
  findGeneticRelatives(dnaId: string, similarityThreshold: number = 0.7): VaskDNA[] {
    const targetDNA = this.dnaRegistry.get(dnaId);
    if (!targetDNA) return [];

    const relatives: { dna: VaskDNA; similarity: number }[] = [];

    for (const [id, dna] of this.dnaRegistry) {
      if (id === dnaId) continue;
      
      const similarity = this.calculateGeneticSimilarity(targetDNA, dna);
      if (similarity >= similarityThreshold) {
        relatives.push({ dna, similarity });
      }
    }

    return relatives
      .sort((a, b) => b.similarity - a.similarity)
      .map(r => r.dna);
  }

  // Private helper methods
  private createContentHash(content: string): string {
    return CryptoJS.SHA256(content).toString().substring(0, 16);
  }

  private createBlockchainFingerprint(blockchainData: any): string {
    const fingerprint = JSON.stringify({
      chainId: blockchainData.chainId,
      blockNumber: blockchainData.blockNumber,
      timestamp: blockchainData.timestamp
    });
    return CryptoJS.MD5(fingerprint).toString();
  }

  private calculateEngagementScore(engagementData: any): number {
    const likes = engagementData.likes || 0;
    const comments = engagementData.comments || 0;
    const shares = engagementData.shares || 0;
    const views = engagementData.views || 1;
    
    return Math.min(100, (likes * 2 + comments * 3 + shares * 4) / views * 10);
  }

  private analyzeContentTraits(content: string, engagementData: any): DNATraits {
    // AI-powered content analysis (simplified for now)
    const words = content.toLowerCase().split(' ');
    
    return {
      virality: Math.min(100, (engagementData.shares || 0) * 10),
      longevity: this.analyzeLongevity(content),
      controversy: this.analyzeControversy(content),
      technicality: this.analyzeTechnicality(content),
      creativity: this.analyzeCreativity(content),
      authenticity: this.analyzeAuthenticity(content),
      blockchainRelevance: this.analyzeBlockchainRelevance(content)
    };
  }

  private crossoverTraits(traits1: DNATraits, traits2: DNATraits): DNATraits {
    // Genetic crossover algorithm
    return {
      virality: Math.round((traits1.virality + traits2.virality) / 2),
      longevity: Math.round((traits1.longevity + traits2.longevity) / 2),
      controversy: Math.round((traits1.controversy + traits2.controversy) / 2),
      technicality: Math.round((traits1.technicality + traits2.technicality) / 2),
      creativity: Math.round((traits1.creativity + traits2.creativity) / 2),
      authenticity: Math.round((traits1.authenticity + traits2.authenticity) / 2),
      blockchainRelevance: Math.round((traits1.blockchainRelevance + traits2.blockchainRelevance) / 2)
    };
  }

  private applyMutations(traits: DNATraits): DNATraits {
    const mutationRate = 0.1; // 10% chance of mutation
    const mutationStrength = 0.2; // 20% change in trait value
    
    const mutatedTraits = { ...traits };
    
    for (const trait in mutatedTraits) {
      if (Math.random() < mutationRate) {
        const currentValue = mutatedTraits[trait as keyof DNATraits];
        const mutation = (Math.random() - 0.5) * mutationStrength * currentValue;
        mutatedTraits[trait as keyof DNATraits] = Math.max(0, Math.min(100, 
          Math.round(currentValue + mutation)
        ));
      }
    }
    
    return mutatedTraits;
  }

  private adaptTraits(traits: DNATraits, engagementData: any): DNATraits {
    // Adapt traits based on actual engagement performance
    const adaptationRate = 0.05; // 5% adaptation per engagement update
    
    return {
      virality: Math.min(100, traits.virality + (engagementData.shares || 0) * adaptationRate),
      longevity: Math.min(100, traits.longevity + (engagementData.timeActive || 0) * adaptationRate),
      controversy: Math.min(100, traits.controversy + (engagementData.controversyScore || 0) * adaptationRate),
      technicality: traits.technicality, // Technicality doesn't change based on engagement
      creativity: Math.min(100, traits.creativity + (engagementData.creativeScore || 0) * adaptationRate),
      authenticity: Math.min(100, traits.authenticity + (engagementData.authenticityScore || 0) * adaptationRate),
      blockchainRelevance: Math.min(100, traits.blockchainRelevance + (engagementData.blockchainScore || 0) * adaptationRate)
    };
  }

  private calculateGeneticSimilarity(dna1: VaskDNA, dna2: VaskDNA): number {
    const traits1 = dna1.traits;
    const traits2 = dna2.traits;
    
    const similarities = [
      Math.abs(traits1.virality - traits2.virality),
      Math.abs(traits1.longevity - traits2.longevity),
      Math.abs(traits1.controversy - traits2.controversy),
      Math.abs(traits1.technicality - traits2.technicality),
      Math.abs(traits1.creativity - traits2.creativity),
      Math.abs(traits1.authenticity - traits2.authenticity),
      Math.abs(traits1.blockchainRelevance - traits2.blockchainRelevance)
    ];
    
    const avgDifference = similarities.reduce((sum, diff) => sum + diff, 0) / similarities.length;
    return Math.max(0, 1 - avgDifference / 100);
  }

  private generateDNAId(): string {
    return `dna_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private predictOffspringEngagement(parent1: VaskDNA, parent2: VaskDNA): number {
    return Math.round((parent1.engagementScore + parent2.engagementScore) / 2);
  }

  private combineBlockchainFingerprints(parent1: VaskDNA, parent2: VaskDNA): string {
    return CryptoJS.MD5(parent1.blockchainFingerprint + parent2.blockchainFingerprint).toString();
  }

  private generateEvolutionNotes(parent1: VaskDNA, parent2: VaskDNA, offspring: VaskDNA): string {
    const dominantTraits = this.findDominantTraits(offspring.traits);
    return `Offspring inherits ${dominantTraits.join(', ')} from parents. Generation ${offspring.generation}.`;
  }

  private findDominantTraits(traits: DNATraits): string[] {
    const traitEntries = Object.entries(traits);
    traitEntries.sort((a, b) => b[1] - a[1]);
    return traitEntries.slice(0, 3).map(([trait]) => trait);
  }

  // Content analysis methods (simplified implementations)
  private analyzeLongevity(content: string): number {
    const longTermWords = ['future', 'long-term', 'forever', 'permanent', 'lasting'];
    const matches = longTermWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 20);
  }

  private analyzeControversy(content: string): number {
    const controversialWords = ['controversial', 'debate', 'disagree', 'wrong', 'mistake'];
    const matches = controversialWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 15);
  }

  private analyzeTechnicality(content: string): number {
    const technicalWords = ['blockchain', 'smart contract', 'defi', 'nft', 'crypto', 'ethereum'];
    const matches = technicalWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 12);
  }

  private analyzeCreativity(content: string): number {
    const creativeWords = ['creative', 'innovative', 'unique', 'original', 'artistic'];
    const matches = creativeWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 18);
  }

  private analyzeAuthenticity(content: string): number {
    const authenticWords = ['personal', 'experience', 'believe', 'opinion', 'honest'];
    const matches = authenticWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 16);
  }

  private analyzeBlockchainRelevance(content: string): number {
    const blockchainWords = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft', 'web3'];
    const matches = blockchainWords.filter(word => content.toLowerCase().includes(word));
    return Math.min(100, matches.length * 14);
  }

  private calculateMutationFactor(engagementData: any): number {
    return Math.min(1, (engagementData.engagement || 0) / 100);
  }
}

// Export singleton instance
export const vaskDNASystem = VaskDNASystem.getInstance();

