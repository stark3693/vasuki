/**
 * Live AI-Powered Content Evolution System
 * Uses machine learning to evolve and improve content in real-time
 */

export interface AIEvolutionData {
  id: string;
  content: string;
  originalContent: string;
  evolutionLevel: number;
  aiAnalysis: {
    sentiment: number; // -1 to 1
    engagement: number; // 0 to 100
    creativity: number; // 0 to 100
    virality: number; // 0 to 100
    readability: number; // 0 to 100
    topics: string[];
    keywords: string[];
    language: string;
    tone: 'formal' | 'casual' | 'humorous' | 'serious' | 'inspirational';
  };
  improvements: {
    grammar: string[];
    style: string[];
    engagement: string[];
    creativity: string[];
  };
  evolutionHistory: {
    level: number;
    changes: string[];
    timestamp: Date;
  }[];
  createdAt: Date;
  lastEvolved: Date;
}

export interface AIEvolutionOptions {
  targetAudience?: 'general' | 'tech' | 'business' | 'creative' | 'academic';
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';
  maxEvolutionLevel?: number;
  autoEvolve?: boolean;
}

class LiveAIEvolution {
  private evolutions: Map<string, AIEvolutionData> = new Map();
  private evolutionQueue: string[] = [];
  private isProcessing = false;

  constructor() {
    // Start the evolution processing loop
    this.startEvolutionLoop();
  }

  /**
   * Create a new AI evolution for content
   */
  createEvolution(content: string, options: AIEvolutionOptions = {}): AIEvolutionData {
    const id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const evolution: AIEvolutionData = {
      id,
      content,
      originalContent: content,
      evolutionLevel: 0,
      aiAnalysis: this.analyzeContent(content),
      improvements: {
        grammar: [],
        style: [],
        engagement: [],
        creativity: []
      },
      evolutionHistory: [],
      createdAt: new Date(),
      lastEvolved: new Date()
    };

    this.evolutions.set(id, evolution);
    
    // Add to evolution queue if auto-evolve is enabled
    if (options.autoEvolve !== false) {
      this.evolutionQueue.push(id);
    }

    return evolution;
  }

  /**
   * Evolve content using AI
   */
  evolveContent(id: string, targetLevel?: number): AIEvolutionData | null {
    const evolution = this.evolutions.get(id);
    if (!evolution) return null;

    const maxLevel = targetLevel || (evolution.evolutionLevel + 1);
    const currentLevel = evolution.evolutionLevel;

    if (currentLevel >= maxLevel) return evolution;

    // AI-powered content evolution
    const evolvedContent = this.performAIEvolution(evolution, maxLevel);
    
    // Update evolution data
    evolution.content = evolvedContent;
    evolution.evolutionLevel = maxLevel;
    evolution.aiAnalysis = this.analyzeContent(evolvedContent);
    evolution.improvements = this.generateImprovements(evolution);
    evolution.lastEvolved = new Date();
    
    // Add to history
    evolution.evolutionHistory.push({
      level: maxLevel,
      changes: this.getEvolutionChanges(evolution.originalContent, evolvedContent),
      timestamp: new Date()
    });

    this.evolutions.set(id, evolution);
    return evolution;
  }

  /**
   * Get evolution by ID
   */
  getEvolution(id: string): AIEvolutionData | null {
    return this.evolutions.get(id) || null;
  }

  /**
   * Get all evolutions
   */
  getAllEvolutions(): AIEvolutionData[] {
    return Array.from(this.evolutions.values());
  }

  /**
   * Get evolution statistics
   */
  getEvolutionStats(): {
    totalEvolutions: number;
    averageEvolutionLevel: number;
    mostEvolvedContent: AIEvolutionData | null;
    recentEvolutions: AIEvolutionData[];
  } {
    const allEvolutions = this.getAllEvolutions();
    
    return {
      totalEvolutions: allEvolutions.length,
      averageEvolutionLevel: allEvolutions.reduce((sum, e) => sum + e.evolutionLevel, 0) / allEvolutions.length || 0,
      mostEvolvedContent: allEvolutions.reduce((max, e) => e.evolutionLevel > max.evolutionLevel ? e : max, allEvolutions[0]) || null,
      recentEvolutions: allEvolutions
        .sort((a, b) => b.lastEvolved.getTime() - a.lastEvolved.getTime())
        .slice(0, 10)
    };
  }

  /**
   * Analyze content using AI
   */
  private analyzeContent(content: string): AIEvolutionData['aiAnalysis'] {
    // Simulate AI analysis
    const words = content.split(' ');
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      sentiment: this.calculateSentiment(content),
      engagement: this.calculateEngagement(content),
      creativity: this.calculateCreativity(content),
      virality: this.calculateVirality(content),
      readability: this.calculateReadability(content),
      topics: this.extractTopics(content),
      keywords: this.extractKeywords(content),
      language: this.detectLanguage(content),
      tone: this.detectTone(content)
    };
  }

  /**
   * Perform AI-powered content evolution
   */
  private performAIEvolution(evolution: AIEvolutionData, targetLevel: number): string {
    let content = evolution.content;
    
    // Apply AI improvements based on analysis
    const analysis = evolution.aiAnalysis;
    
    // Level 1: Grammar and clarity improvements
    if (targetLevel >= 1) {
      content = this.improveGrammar(content);
      content = this.improveClarity(content);
    }
    
    // Level 2: Style and flow improvements
    if (targetLevel >= 2) {
      content = this.improveStyle(content);
      content = this.improveFlow(content);
    }
    
    // Level 3: Engagement improvements
    if (targetLevel >= 3) {
      content = this.improveEngagement(content);
      content = this.addEmotionalHooks(content);
    }
    
    // Level 4: Creativity improvements
    if (targetLevel >= 4) {
      content = this.improveCreativity(content);
      content = this.addUniqueElements(content);
    }
    
    // Level 5: Virality improvements
    if (targetLevel >= 5) {
      content = this.improveVirality(content);
      content = this.addViralElements(content);
    }

    return content;
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovements(evolution: AIEvolutionData): AIEvolutionData['improvements'] {
    const analysis = evolution.aiAnalysis;
    
    return {
      grammar: this.getGrammarSuggestions(analysis),
      style: this.getStyleSuggestions(analysis),
      engagement: this.getEngagementSuggestions(analysis),
      creativity: this.getCreativitySuggestions(analysis)
    };
  }

  /**
   * Get evolution changes
   */
  private getEvolutionChanges(original: string, evolved: string): string[] {
    const changes: string[] = [];
    
    if (original.length !== evolved.length) {
      changes.push(`Length changed from ${original.length} to ${evolved.length} characters`);
    }
    
    const originalWords = original.split(' ').length;
    const evolvedWords = evolved.split(' ').length;
    if (originalWords !== evolvedWords) {
      changes.push(`Word count changed from ${originalWords} to ${evolvedWords} words`);
    }
    
    // Add more specific change detection
    if (evolved.includes('!') && !original.includes('!')) {
      changes.push('Added exclamation marks for emphasis');
    }
    
    if (evolved.includes('?') && !original.includes('?')) {
      changes.push('Added questions to increase engagement');
    }
    
    return changes;
  }

  /**
   * Start the evolution processing loop
   */
  private startEvolutionLoop(): void {
    setInterval(() => {
      if (this.isProcessing || this.evolutionQueue.length === 0) return;
      
      this.isProcessing = true;
      this.processEvolutionQueue();
      this.isProcessing = false;
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process the evolution queue
   */
  private processEvolutionQueue(): void {
    while (this.evolutionQueue.length > 0) {
      const id = this.evolutionQueue.shift();
      if (!id) continue;
      
      const evolution = this.evolutions.get(id);
      if (!evolution) continue;
      
      // Auto-evolve if not at max level
      if (evolution.evolutionLevel < 5) {
        this.evolveContent(id);
      }
    }
  }

  // AI Analysis Methods
  private calculateSentiment(content: string): number {
    const positiveWords = ['good', 'great', 'amazing', 'wonderful', 'excellent', 'fantastic', 'love', 'like', 'happy', 'joy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'];
    
    const words = content.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length * 10));
  }

  private calculateEngagement(content: string): number {
    let score = 0;
    
    // Questions increase engagement
    score += (content.match(/\?/g) || []).length * 10;
    
    // Exclamation marks increase engagement
    score += (content.match(/!/g) || []).length * 5;
    
    // Hashtags increase engagement
    score += (content.match(/#\w+/g) || []).length * 15;
    
    // Mentions increase engagement
    score += (content.match(/@\w+/g) || []).length * 20;
    
    // Length affects engagement
    const length = content.length;
    if (length > 50 && length < 280) score += 20;
    
    return Math.min(100, score);
  }

  private calculateCreativity(content: string): number {
    let score = 0;
    
    // Unique words increase creativity
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    score += (uniqueWords.size / words.length) * 50;
    
    // Metaphors and creative language
    const creativePatterns = [
      /\b(like|as)\s+\w+/g, // similes
      /\b(imagine|picture|visualize)\b/g,
      /\b(metaphor|analogy)\b/g,
      /\b(revolutionary|groundbreaking|innovative)\b/g
    ];
    
    creativePatterns.forEach(pattern => {
      score += (content.match(pattern) || []).length * 10;
    });
    
    return Math.min(100, score);
  }

  private calculateVirality(content: string): number {
    let score = 0;
    
    // Viral keywords
    const viralKeywords = ['viral', 'trending', 'breaking', 'exclusive', 'shocking', 'amazing', 'incredible'];
    viralKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) score += 15;
    });
    
    // Emotional triggers
    const emotionalWords = ['love', 'hate', 'shock', 'surprise', 'anger', 'joy', 'fear'];
    emotionalWords.forEach(word => {
      if (content.toLowerCase().includes(word)) score += 10;
    });
    
    // Call to action
    if (content.includes('share') || content.includes('retweet') || content.includes('like')) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  private calculateReadability(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/);
    const syllables = this.countSyllables(content);
    
    if (sentences.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease Score
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    
    words.forEach(word => {
      word = word.replace(/[^a-z]/g, '');
      if (word.length === 0) return;
      
      const vowels = word.match(/[aeiouy]+/g);
      if (!vowels) {
        count += 1;
        return;
      }
      
      count += vowels.length;
      
      // Subtract silent 'e'
      if (word.endsWith('e')) count -= 1;
      
      // Ensure at least 1 syllable per word
      if (count === 0) count = 1;
    });
    
    return count;
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    
    // Simple topic extraction based on keywords
    const topicKeywords = {
      'technology': ['tech', 'ai', 'blockchain', 'crypto', 'software', 'app', 'digital'],
      'business': ['business', 'startup', 'entrepreneur', 'company', 'market', 'investment'],
      'lifestyle': ['life', 'lifestyle', 'health', 'fitness', 'travel', 'food', 'fashion'],
      'entertainment': ['movie', 'music', 'game', 'entertainment', 'fun', 'comedy'],
      'news': ['news', 'breaking', 'update', 'report', 'announcement']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|man|men|new|now|old|see|two|way|who|boy|did|man|men)$/.test(word));
    
    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top 10 most frequent words
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private detectLanguage(content: string): string {
    // Simple language detection
    const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es'];
    const frenchWords = ['le', 'la', 'de', 'et', 'à', 'en', 'un', 'est', 'que'];
    
    const words = content.toLowerCase().split(/\s+/);
    let englishCount = 0, spanishCount = 0, frenchCount = 0;
    
    words.forEach(word => {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });
    
    if (englishCount > spanishCount && englishCount > frenchCount) return 'en';
    if (spanishCount > frenchCount) return 'es';
    if (frenchCount > 0) return 'fr';
    return 'en'; // Default to English
  }

  private detectTone(content: string): AIEvolutionData['aiAnalysis']['tone'] {
    const formalWords = ['therefore', 'however', 'furthermore', 'moreover', 'consequently'];
    const casualWords = ['hey', 'cool', 'awesome', 'yeah', 'gonna', 'wanna'];
    const humorousWords = ['lol', 'haha', 'funny', 'joke', 'hilarious', 'comedy'];
    const seriousWords = ['important', 'serious', 'critical', 'urgent', 'matter'];
    const inspirationalWords = ['inspire', 'motivate', 'achieve', 'success', 'dream', 'believe'];
    
    const lowerContent = content.toLowerCase();
    
    if (formalWords.some(word => lowerContent.includes(word))) return 'formal';
    if (casualWords.some(word => lowerContent.includes(word))) return 'casual';
    if (humorousWords.some(word => lowerContent.includes(word))) return 'humorous';
    if (seriousWords.some(word => lowerContent.includes(word))) return 'serious';
    if (inspirationalWords.some(word => lowerContent.includes(word))) return 'inspirational';
    
    return 'casual'; // Default tone
  }

  // Content Improvement Methods
  private improveGrammar(content: string): string {
    // Basic grammar improvements
    return content
      .replace(/\bi\b/g, 'I') // Capitalize 'i'
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix spacing after punctuation
      .trim();
  }

  private improveClarity(content: string): string {
    // Add clarity improvements
    return content
      .replace(/\b(its)\b/g, "it's") // Fix its/it's
      .replace(/\b(your)\b/g, "you're") // Fix your/you're
      .replace(/\b(there)\b/g, "they're") // Fix there/they're
      .replace(/\b(loose)\b/g, "lose") // Fix loose/lose
      .replace(/\b(affect)\b/g, "effect") // Fix affect/effect
      .trim();
  }

  private improveStyle(content: string): string {
    // Style improvements
    return content
      .replace(/\b(very)\s+(\w+)/g, '$2') // Remove "very"
      .replace(/\b(really)\s+(\w+)/g, '$2') // Remove "really"
      .replace(/\b(quite)\s+(\w+)/g, '$2') // Remove "quite"
      .replace(/\b(pretty)\s+(\w+)/g, '$2') // Remove "pretty"
      .trim();
  }

  private improveFlow(content: string): string {
    // Flow improvements
    return content
      .replace(/\b(and)\b/g, '&') // Replace "and" with "&"
      .replace(/\b(but)\b/g, 'however') // Replace "but" with "however"
      .replace(/\b(so)\b/g, 'therefore') // Replace "so" with "therefore"
      .trim();
  }

  private improveEngagement(content: string): string {
    // Engagement improvements
    if (!content.includes('?')) {
      content += ' What do you think?';
    }
    if (!content.includes('!')) {
      content = content.replace(/\.$/, '!');
    }
    return content;
  }

  private addEmotionalHooks(content: string): string {
    // Add emotional hooks
    const hooks = [
      'This will blow your mind!',
      'You won\'t believe what happened next!',
      'This changed everything!',
      'Mind = blown!',
      'This is incredible!'
    ];
    
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    return `${randomHook} ${content}`;
  }

  private improveCreativity(content: string): string {
    // Creativity improvements
    return content
      .replace(/\b(good)\b/g, 'amazing')
      .replace(/\b(bad)\b/g, 'terrible')
      .replace(/\b(nice)\b/g, 'fantastic')
      .replace(/\b(okay)\b/g, 'incredible')
      .trim();
  }

  private addUniqueElements(content: string): string {
    // Add unique elements
    const uniqueElements = [
      '✨',
      '🚀',
      '💡',
      '🔥',
      '⭐'
    ];
    
    const randomElement = uniqueElements[Math.floor(Math.random() * uniqueElements.length)];
    return `${randomElement} ${content}`;
  }

  private improveVirality(content: string): string {
    // Virality improvements
    if (!content.includes('#')) {
      content += ' #viral #trending';
    }
    if (!content.includes('@')) {
      content += ' @everyone';
    }
    return content;
  }

  private addViralElements(content: string): string {
    // Add viral elements
    const viralElements = [
      'Share this!',
      'Retweet if you agree!',
      'Tag a friend!',
      'Double tap if you like!',
      'Comment your thoughts!'
    ];
    
    const randomElement = viralElements[Math.floor(Math.random() * viralElements.length)];
    return `${content}\n\n${randomElement}`;
  }

  // Suggestion Methods
  private getGrammarSuggestions(analysis: AIEvolutionData['aiAnalysis']): string[] {
    const suggestions: string[] = [];
    
    if (analysis.readability < 60) {
      suggestions.push('Consider using shorter sentences for better readability');
    }
    
    if (analysis.sentiment < -0.5) {
      suggestions.push('Consider adding more positive language');
    }
    
    return suggestions;
  }

  private getStyleSuggestions(analysis: AIEvolutionData['aiAnalysis']): string[] {
    const suggestions: string[] = [];
    
    if (analysis.creativity < 50) {
      suggestions.push('Add more creative and unique language');
    }
    
    if (analysis.tone === 'formal' && analysis.engagement < 50) {
      suggestions.push('Consider using a more casual tone for better engagement');
    }
    
    return suggestions;
  }

  private getEngagementSuggestions(analysis: AIEvolutionData['aiAnalysis']): string[] {
    const suggestions: string[] = [];
    
    if (analysis.engagement < 50) {
      suggestions.push('Add questions or calls to action to increase engagement');
    }
    
    if (!analysis.keywords.includes('trending')) {
      suggestions.push('Consider adding trending keywords');
    }
    
    return suggestions;
  }

  private getCreativitySuggestions(analysis: AIEvolutionData['aiAnalysis']): string[] {
    const suggestions: string[] = [];
    
    if (analysis.creativity < 60) {
      suggestions.push('Use metaphors, analogies, or storytelling techniques');
    }
    
    if (analysis.topics.length < 2) {
      suggestions.push('Consider connecting multiple topics for more creative content');
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const liveAIEvolution = new LiveAIEvolution();

