// Live DNA Evolution System - Never implemented before in any social media
// This creates real-time content breeding and evolution

export interface DNAStrand {
  id: string;
  content: string;
  traits: {
    virality: number;
    creativity: number;
    engagement: number;
    blockchain: number;
    innovation: number;
  };
  generation: number;
  parents: string[];
  mutations: string[];
  fitness: number;
  timestamp: number;
}

export interface EvolutionEvent {
  type: 'breeding' | 'mutation' | 'extinction' | 'evolution';
  parent1?: DNAStrand;
  parent2?: DNAStrand;
  offspring?: DNAStrand;
  message: string;
  timestamp: number;
}

class LiveDNAEvolutionSystem {
  private strands: Map<string, DNAStrand> = new Map();
  private evolutionEvents: EvolutionEvent[] = [];
  private isRunning = false;
  private evolutionInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(event: EvolutionEvent) => void> = new Set();

  // Start the live evolution system
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Create initial population
    this.createInitialPopulation();
    
    // Start evolution cycle every 30 seconds
    this.evolutionInterval = setInterval(() => {
      this.evolve();
    }, 30000);
    
    console.log('🧬 Live DNA Evolution System Started');
  }

  // Stop the evolution system
  stop() {
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = null;
    }
    this.isRunning = false;
    console.log('🧬 Live DNA Evolution System Stopped');
  }

  // Create initial population of DNA strands
  private createInitialPopulation() {
    const initialStrands = [
      {
        content: "Hello World! Welcome to the future of social media.",
        traits: { virality: 60, creativity: 40, engagement: 50, blockchain: 30, innovation: 70 },
        generation: 0
      },
      {
        content: "Blockchain technology is revolutionizing everything we know.",
        traits: { virality: 40, creativity: 80, engagement: 60, blockchain: 90, innovation: 85 },
        generation: 0
      },
      {
        content: "AI and humans working together to create amazing content.",
        traits: { virality: 70, creativity: 90, engagement: 80, blockchain: 50, innovation: 95 },
        generation: 0
      }
    ];

    initialStrands.forEach((strand, index) => {
      const dnaStrand: DNAStrand = {
        id: `strand_${Date.now()}_${index}`,
        content: strand.content,
        traits: strand.traits,
        generation: strand.generation,
        parents: [],
        mutations: [],
        fitness: this.calculateFitness(strand.traits),
        timestamp: Date.now()
      };
      this.strands.set(dnaStrand.id, dnaStrand);
    });
  }

  // Calculate fitness score for a DNA strand
  private calculateFitness(traits: DNAStrand['traits']): number {
    const weights = {
      virality: 0.25,
      creativity: 0.25,
      engagement: 0.2,
      blockchain: 0.15,
      innovation: 0.15
    };

    return Object.entries(traits).reduce((total, [trait, value]) => {
      return total + (value * weights[trait as keyof typeof weights]);
    }, 0);
  }

  // Main evolution cycle
  private evolve() {
    if (this.strands.size < 2) return;

    const strands = Array.from(this.strands.values());
    
    // Select parents based on fitness
    const parents = this.selectParents(strands);
    
    if (parents.length >= 2) {
      // Breed new offspring
      const offspring = this.breed(parents[0], parents[1]);
      this.strands.set(offspring.id, offspring);
      
      // Emit breeding event
      this.emitEvent({
        type: 'breeding',
        parent1: parents[0],
        parent2: parents[1],
        offspring,
        message: `🧬 New DNA strand evolved! Generation ${offspring.generation}`,
        timestamp: Date.now()
      });
    }

    // Random mutations
    this.introduceMutations();

    // Remove low-fitness strands (natural selection)
    this.naturalSelection();

    // Limit population size
    this.limitPopulation();
  }

  // Select parents for breeding based on fitness
  private selectParents(strands: DNAStrand[]): DNAStrand[] {
    // Sort by fitness
    const sorted = strands.sort((a, b) => b.fitness - a.fitness);
    
    // Select top 50% for breeding
    const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    
    // Randomly select 2 parents from top half
    const shuffled = [...topHalf].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  // Breed two DNA strands to create offspring
  private breed(parent1: DNAStrand, parent2: DNAStrand): DNAStrand {
    const offspringTraits: DNAStrand['traits'] = {
      virality: this.crossoverTrait(parent1.traits.virality, parent2.traits.virality),
      creativity: this.crossoverTrait(parent1.traits.creativity, parent2.traits.creativity),
      engagement: this.crossoverTrait(parent1.traits.engagement, parent2.traits.engagement),
      blockchain: this.crossoverTrait(parent1.traits.blockchain, parent2.traits.blockchain),
      innovation: this.crossoverTrait(parent1.traits.innovation, parent2.traits.innovation)
    };

    // Create hybrid content
    const offspringContent = this.createHybridContent(parent1.content, parent2.content);

    const offspring: DNAStrand = {
      id: `strand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: offspringContent,
      traits: offspringTraits,
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      parents: [parent1.id, parent2.id],
      mutations: [],
      fitness: this.calculateFitness(offspringTraits),
      timestamp: Date.now()
    };

    return offspring;
  }

  // Crossover trait values with some randomness
  private crossoverTrait(trait1: number, trait2: number): number {
    const average = (trait1 + trait2) / 2;
    const variation = (Math.random() - 0.5) * 20; // ±10 variation
    return Math.max(0, Math.min(100, average + variation));
  }

  // Create hybrid content from two parent contents using advanced genetic algorithms
  private createHybridContent(content1: string, content2: string): string {
    const words1 = this.tokenizeContent(content1);
    const words2 = this.tokenizeContent(content2);
    
    // Calculate word importance scores based on frequency and position
    const importance1 = this.calculateWordImportance(words1);
    const importance2 = this.calculateWordImportance(words2);
    
    // Create hybrid using weighted selection based on importance
    const hybridWords: string[] = [];
    const maxLength = Math.max(words1.length, words2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const word1 = words1[i];
      const word2 = words2[i];
      
      if (word1 && word2) {
        // Weighted selection based on importance scores
        const weight1 = importance1[word1] || 0.5;
        const weight2 = importance2[word2] || 0.5;
        const totalWeight = weight1 + weight2;
        
        if (Math.random() < weight1 / totalWeight) {
          hybridWords.push(word1);
        } else {
          hybridWords.push(word2);
        }
      } else if (word1) {
        hybridWords.push(word1);
      } else if (word2) {
        hybridWords.push(word2);
      }
    }
    
    // Apply genetic mutations
    const mutatedWords = this.applyMutations(hybridWords);
    
    // Add intelligent connectors based on context
    const connectedWords = this.addIntelligentConnectors(mutatedWords);
    
    return connectedWords.join(' ');
  }

  // Tokenize content with better word splitting
  private tokenizeContent(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 20); // Limit to 20 words for performance
  }

  // Calculate word importance based on frequency and position
  private calculateWordImportance(words: string[]): Record<string, number> {
    const importance: Record<string, number> = {};
    const wordCount: Record<string, number> = {};
    
    // Count word frequency
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Calculate importance scores
    words.forEach((word, index) => {
      const frequency = wordCount[word] / words.length;
      const position = 1 - (index / words.length); // Earlier words are more important
      const length = Math.min(word.length / 10, 1); // Longer words are slightly more important
      
      importance[word] = (frequency * 0.4) + (position * 0.4) + (length * 0.2);
    });
    
    return importance;
  }

  // Apply genetic mutations to words
  private applyMutations(words: string[]): string[] {
    return words.map(word => {
      if (Math.random() < 0.1) { // 10% mutation rate
        return this.mutateWord(word);
      }
      return word;
    });
  }

  // Mutate a single word
  private mutateWord(word: string): string {
    const mutations = [
      // Add prefix
      () => ['re', 'un', 'pre', 'anti'][Math.floor(Math.random() * 4)] + word,
      // Add suffix
      () => word + ['ing', 'ed', 'er', 'ly'][Math.floor(Math.random() * 4)],
      // Replace character
      () => {
        const chars = word.split('');
        const index = Math.floor(Math.random() * chars.length);
        chars[index] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        return chars.join('');
      },
      // Remove character
      () => {
        const chars = word.split('');
        if (chars.length > 3) {
          chars.splice(Math.floor(Math.random() * chars.length), 1);
        }
        return chars.join('');
      }
    ];
    
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    return mutation();
  }

  // Add intelligent connectors based on context
  private addIntelligentConnectors(words: string[]): string[] {
    const connectors = {
      'and': ['and', 'plus', 'along with'],
      'but': ['but', 'however', 'yet'],
      'or': ['or', 'alternatively', 'either'],
      'because': ['because', 'since', 'due to'],
      'so': ['so', 'therefore', 'thus'],
      'then': ['then', 'next', 'afterwards']
    };
    
    const result: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      result.push(words[i]);
      
      // Add connector between words with 20% probability
      if (i < words.length - 1 && Math.random() < 0.2) {
        const connectorType = Object.keys(connectors)[Math.floor(Math.random() * Object.keys(connectors).length)];
        const connectorOptions = connectors[connectorType as keyof typeof connectors];
        const connector = connectorOptions[Math.floor(Math.random() * connectorOptions.length)];
        result.push(connector);
      }
    }
    
    return result;
  }

  // Introduce random mutations
  private introduceMutations() {
    const strands = Array.from(this.strands.values());
    const mutationChance = 0.1; // 10% chance per strand
    
    strands.forEach(strand => {
      if (Math.random() < mutationChance) {
        this.mutateStrand(strand);
      }
    });
  }

  // Mutate a specific DNA strand
  private mutateStrand(strand: DNAStrand) {
    const traits = Object.keys(strand.traits) as Array<keyof DNAStrand['traits']>;
    const randomTrait = traits[Math.floor(Math.random() * traits.length)];
    
    const mutationAmount = (Math.random() - 0.5) * 30; // ±15 variation
    const newValue = Math.max(0, Math.min(100, strand.traits[randomTrait] + mutationAmount));
    
    strand.traits[randomTrait] = newValue;
    strand.fitness = this.calculateFitness(strand.traits);
    strand.mutations.push(`${randomTrait}: ${mutationAmount > 0 ? '+' : ''}${mutationAmount.toFixed(1)}`);
    
    this.emitEvent({
      type: 'mutation',
      message: `🧬 Mutation in ${randomTrait}: ${mutationAmount > 0 ? '+' : ''}${mutationAmount.toFixed(1)}`,
      timestamp: Date.now()
    });
  }

  // Natural selection - remove low fitness strands
  private naturalSelection() {
    const strands = Array.from(this.strands.values());
    const averageFitness = strands.reduce((sum, s) => sum + s.fitness, 0) / strands.length;
    const threshold = averageFitness * 0.7; // Remove strands below 70% of average
    
    const toRemove: string[] = [];
    strands.forEach(strand => {
      if (strand.fitness < threshold && Math.random() < 0.3) {
        toRemove.push(strand.id);
      }
    });
    
    toRemove.forEach(id => {
      this.strands.delete(id);
      this.emitEvent({
        type: 'extinction',
        message: `🧬 Low-fitness strand removed from population`,
        timestamp: Date.now()
      });
    });
  }

  // Limit population size
  private limitPopulation() {
    const maxPopulation = 50;
    if (this.strands.size > maxPopulation) {
      const strands = Array.from(this.strands.values());
      const sorted = strands.sort((a, b) => a.fitness - b.fitness);
      const toRemove = sorted.slice(0, this.strands.size - maxPopulation);
      
      toRemove.forEach(strand => {
        this.strands.delete(strand.id);
      });
    }
  }

  // Subscribe to evolution events
  subscribe(callback: (event: EvolutionEvent) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Emit evolution event to all subscribers
  private emitEvent(event: EvolutionEvent) {
    this.evolutionEvents.push(event);
    this.subscribers.forEach(callback => callback(event));
    
    // Keep only last 100 events
    if (this.evolutionEvents.length > 100) {
      this.evolutionEvents = this.evolutionEvents.slice(-100);
    }
  }

  // Get current population
  getPopulation(): DNAStrand[] {
    return Array.from(this.strands.values()).sort((a, b) => b.fitness - a.fitness);
  }

  // Get evolution events
  getEvents(): EvolutionEvent[] {
    return [...this.evolutionEvents].reverse();
  }

  // Get statistics
  getStatistics() {
    const strands = Array.from(this.strands.values());
    const avgFitness = strands.reduce((sum, s) => sum + s.fitness, 0) / strands.length;
    const maxGeneration = Math.max(...strands.map(s => s.generation), 0);
    const totalMutations = strands.reduce((sum, s) => sum + s.mutations.length, 0);
    
    return {
      populationSize: strands.length,
      averageFitness: avgFitness,
      maxGeneration,
      totalMutations,
      isRunning: this.isRunning
    };
  }

  // Breed two DNA strands to create offspring
  breedStrands(parent1Id: string, parent2Id: string): DNAStrand {
    const parent1 = this.strands.get(parent1Id);
    const parent2 = this.strands.get(parent2Id);
    
    if (!parent1 || !parent2) {
      throw new Error('Parent strands not found');
    }
    
    const offspring = this.breed(parent1, parent2);
    this.strands.set(offspring.id, offspring);
    
    return offspring;
  }

  // Add new content to the evolution pool
  addContent(content: string, traits?: Partial<DNAStrand['traits']>) {
    const defaultTraits: DNAStrand['traits'] = {
      virality: Math.random() * 100,
      creativity: Math.random() * 100,
      engagement: Math.random() * 100,
      blockchain: Math.random() * 100,
      innovation: Math.random() * 100
    };

    const dnaStrand: DNAStrand = {
      id: `strand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      traits: { ...defaultTraits, ...traits },
      generation: 0,
      parents: [],
      mutations: [],
      fitness: this.calculateFitness({ ...defaultTraits, ...traits }),
      timestamp: Date.now()
    };

    this.strands.set(dnaStrand.id, dnaStrand);
    
    this.emitEvent({
      type: 'evolution',
      message: `🧬 New content added to evolution pool`,
      timestamp: Date.now()
    });

    return dnaStrand;
  }
}

// Export singleton instance
export const liveDNAEvolution = new LiveDNAEvolutionSystem();
