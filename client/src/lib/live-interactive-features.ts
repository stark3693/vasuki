/**
 * LIVE INTERACTIVE FEATURES
 * Mind-blowing real-time features that will make users addicted!
 */

export interface LiveUser {
  id: string;
  name: string;
  avatar: string;
  walletAddress: string;
  level: number;
  xp: number;
  badges: string[];
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  location?: {
    x: number;
    y: number;
  };
}

export interface LiveEvent {
  id: string;
  type: 'user_joined' | 'post_created' | 'like_burst' | 'trending_alert' | 'viral_moment' | 'collaboration' | 'achievement';
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  data?: any;
  animation?: string;
}

export interface LiveNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'achievement' | 'trending';
  title: string;
  message: string;
  timestamp: Date;
  duration: number;
  icon: string;
  sound?: string;
}

export interface LiveInteraction {
  id: string;
  type: 'wave' | 'high_five' | 'hug' | 'dance' | 'celebration' | 'collaboration';
  fromUser: string;
  toUser: string;
  timestamp: Date;
  animation: string;
  message: string;
}

class LiveInteractiveFeatures {
  private users: Map<string, LiveUser> = new Map();
  private events: LiveEvent[] = [];
  private notifications: LiveNotification[] = [];
  private interactions: LiveInteraction[] = [];
  private subscribers: Set<(event: LiveEvent) => void> = new Set();
  private notificationSubscribers: Set<(notification: LiveNotification) => void> = new Set();
  private isRunning = false;
  private eventInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSystem();
  }

  /**
   * Initialize the live system
   */
  private initializeSystem(): void {
    this.isRunning = true;
    this.startEventGeneration();
    this.startNotificationSystem();
    this.startUserTracking();
  }

  /**
   * Start generating live events
   */
  private startEventGeneration(): void {
    this.eventInterval = setInterval(() => {
      this.generateRandomEvent();
    }, 3000); // Generate event every 3 seconds
  }

  /**
   * Start notification system
   */
  private startNotificationSystem(): void {
    setInterval(() => {
      this.generateRandomNotification();
    }, 5000); // Generate notification every 5 seconds
  }

  /**
   * Start user tracking
   */
  private startUserTracking(): void {
    setInterval(() => {
      this.updateUserStatus();
    }, 1000); // Update every second
  }

  /**
   * Generate random live event
   */
  private generateRandomEvent(): void {
    const eventTypes = ['user_joined', 'post_created', 'like_burst', 'trending_alert', 'viral_moment', 'collaboration', 'achievement'];
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const event: LiveEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: randomType as any,
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      userName: this.generateRandomName(),
      message: this.generateEventMessage(randomType),
      timestamp: new Date(),
      animation: this.getAnimationForEvent(randomType)
    };

    this.events.push(event);
    
    // Keep only last 50 events
    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(event));
  }

  /**
   * Generate random notification
   */
  private generateRandomNotification(): void {
    const notificationTypes = ['success', 'warning', 'info', 'achievement', 'trending'];
    const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    
    const notification: LiveNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: randomType as any,
      title: this.generateNotificationTitle(randomType),
      message: this.generateNotificationMessage(randomType),
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 5000) + 3000, // 3-8 seconds
      icon: this.getIconForNotification(randomType),
      sound: this.getSoundForNotification(randomType)
    };

    this.notifications.push(notification);
    
    // Keep only last 20 notifications
    if (this.notifications.length > 20) {
      this.notifications = this.notifications.slice(-20);
    }

    // Notify subscribers
    this.notificationSubscribers.forEach(callback => callback(notification));
  }

  /**
   * Update user status
   */
  private updateUserStatus(): void {
    this.users.forEach(user => {
      // Simulate user activity
      if (Math.random() > 0.95) { // 5% chance to change status
        const statuses: LiveUser['status'][] = ['online', 'away', 'offline'];
        user.status = statuses[Math.floor(Math.random() * statuses.length)];
        user.lastSeen = new Date();
      }
    });
  }

  /**
   * Add user to live system
   */
  addUser(user: LiveUser): void {
    this.users.set(user.id, user);
    
    // Generate join event
    const event: LiveEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user_joined',
      userId: user.id,
      userName: user.name,
      message: `${user.name} just joined the live experience!`,
      timestamp: new Date(),
      animation: 'user-join'
    };

    this.events.push(event);
    this.subscribers.forEach(callback => callback(event));
  }

  /**
   * Create live interaction between users
   */
  createInteraction(fromUser: string, toUser: string, type: LiveInteraction['type']): LiveInteraction {
    const interaction: LiveInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      fromUser,
      toUser,
      timestamp: new Date(),
      animation: this.getAnimationForInteraction(type),
      message: this.getMessageForInteraction(type)
    };

    this.interactions.push(interaction);
    
    // Keep only last 100 interactions
    if (this.interactions.length > 100) {
      this.interactions = this.interactions.slice(-100);
    }

    return interaction;
  }

  /**
   * Subscribe to live events
   */
  subscribeToEvents(callback: (event: LiveEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications(callback: (notification: LiveNotification) => void): () => void {
    this.notificationSubscribers.add(callback);
    return () => this.notificationSubscribers.delete(callback);
  }

  /**
   * Get live events
   */
  getLiveEvents(): LiveEvent[] {
    return [...this.events].reverse();
  }

  /**
   * Get live notifications
   */
  getLiveNotifications(): LiveNotification[] {
    return [...this.notifications].reverse();
  }

  /**
   * Get live interactions
   */
  getLiveInteractions(): LiveInteraction[] {
    return [...this.interactions].reverse();
  }

  /**
   * Get live users
   */
  getLiveUsers(): LiveUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return Array.from(this.users.values()).filter(user => user.status === 'online').length;
  }

  /**
   * Generate random name
   */
  private generateRandomName(): string {
    const names = [
      'CryptoKing', 'BlockchainQueen', 'NFTMaster', 'DeFiWizard', 'Web3Ninja',
      'MetaverseExplorer', 'ChainWarrior', 'TokenHunter', 'SmartContractGuru',
      'DecentralizedDev', 'CryptoArtist', 'BlockchainBuilder', 'NFTCollector',
      'DeFiTrader', 'Web3Creator', 'MetaversePioneer', 'ChainInnovator',
      'TokenDesigner', 'SmartContractExpert', 'DecentralizedVisionary'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate event message
   */
  private generateEventMessage(type: string): string {
    const messages = {
      'user_joined': [
        'just joined the revolution! 🚀',
        'entered the metaverse! 🌟',
        'connected to the future! ⚡',
        'joined the blockchain party! 🎉',
        'became part of the ecosystem! 🔗'
      ],
      'post_created': [
        'created a viral post! 🔥',
        'shared revolutionary content! 💡',
        'posted something amazing! ✨',
        'created blockchain magic! 🪄',
        'shared the future! 🚀'
      ],
      'like_burst': [
        'got a like explosion! 💥',
        'received massive love! ❤️',
        'got viral attention! 🌟',
        'received community support! 👥',
        'got trending momentum! 📈'
      ],
      'trending_alert': [
        'is trending now! 🔥',
        'went viral! 📈',
        'is the talk of the town! 💬',
        'is breaking the internet! 🌐',
        'is setting new records! 🏆'
      ],
      'viral_moment': [
        'just went viral! 🚀',
        'created a viral moment! 💥',
        'broke the internet! 🌐',
        'set a new record! 🏆',
        'became a legend! 👑'
      ],
      'collaboration': [
        'started a collaboration! 🤝',
        'joined forces with others! 💪',
        'created a partnership! 🤝',
        'formed an alliance! ⚔️',
        'built something together! 🏗️'
      ],
      'achievement': [
        'unlocked a new achievement! 🏆',
        'reached a new level! ⬆️',
        'earned a special badge! 🥇',
        'completed a milestone! ✅',
        'gained new powers! ⚡'
      ]
    };

    const typeMessages = messages[type as keyof typeof messages] || ['did something amazing! ✨'];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }

  /**
   * Generate notification title
   */
  private generateNotificationTitle(type: string): string {
    const titles = {
      'success': ['Success!', 'Achievement Unlocked!', 'Congratulations!', 'Well Done!', 'Awesome!'],
      'warning': ['Alert!', 'Warning!', 'Attention!', 'Notice!', 'Heads Up!'],
      'info': ['Update!', 'News!', 'Info!', 'Announcement!', 'Update!'],
      'achievement': ['New Badge!', 'Level Up!', 'Milestone!', 'Achievement!', 'Progress!'],
      'trending': ['Trending!', 'Viral!', 'Hot!', 'Popular!', 'Fire!']
    };

    const typeTitles = titles[type as keyof typeof titles] || ['Notification!'];
    return typeTitles[Math.floor(Math.random() * typeTitles.length)];
  }

  /**
   * Generate notification message
   */
  private generateNotificationMessage(type: string): string {
    const messages = {
      'success': [
        'Your post is getting amazing engagement!',
        'You\'ve reached a new milestone!',
        'Great job on that viral content!',
        'Your creativity is inspiring others!',
        'You\'re building an amazing community!'
      ],
      'warning': [
        'New trending topic detected!',
        'High activity in your network!',
        'Opportunity to engage!',
        'Time to create some content!',
        'Your followers are active!'
      ],
      'info': [
        'New features are now available!',
        'System update completed!',
        'New users joined your network!',
        'Your content is being shared!',
        'Community is growing!'
      ],
      'achievement': [
        'You earned the "Viral Creator" badge!',
        'Level up! You\'re now a "Content Master"!',
        'New achievement: "Community Builder"!',
        'You unlocked "Blockchain Pioneer" status!',
        'Congratulations! You\'re a "Web3 Legend"!'
      ],
      'trending': [
        'Your post is trending worldwide!',
        'You\'re going viral right now!',
        'Your content is breaking records!',
        'You\'re the talk of the internet!',
        'Your post is setting new standards!'
      ]
    };

    const typeMessages = messages[type as keyof typeof messages] || ['Something amazing happened!'];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }

  /**
   * Get animation for event
   */
  private getAnimationForEvent(type: string): string {
    const animations = {
      'user_joined': 'user-join-bounce',
      'post_created': 'content-creation-sparkle',
      'like_burst': 'heart-explosion',
      'trending_alert': 'trending-fire',
      'viral_moment': 'viral-rocket',
      'collaboration': 'collaboration-hands',
      'achievement': 'achievement-glow'
    };

    return animations[type as keyof typeof animations] || 'default-pulse';
  }

  /**
   * Get animation for interaction
   */
  private getAnimationForInteraction(type: string): string {
    const animations = {
      'wave': 'wave-animation',
      'high_five': 'high-five-slap',
      'hug': 'hug-embrace',
      'dance': 'dance-move',
      'celebration': 'celebration-confetti',
      'collaboration': 'collaboration-connect'
    };

    return animations[type as keyof typeof animations] || 'default-interaction';
  }

  /**
   * Get message for interaction
   */
  private getMessageForInteraction(type: string): string {
    const messages = {
      'wave': 'waved at you! 👋',
      'high_five': 'gave you a high five! ✋',
      'hug': 'sent you a virtual hug! 🤗',
      'dance': 'invited you to dance! 💃',
      'celebration': 'celebrated with you! 🎉',
      'collaboration': 'wants to collaborate! 🤝'
    };

    return messages[type as keyof typeof messages] || 'interacted with you! ✨';
  }

  /**
   * Get icon for notification
   */
  private getIconForNotification(type: string): string {
    const icons = {
      'success': '✅',
      'warning': '⚠️',
      'info': 'ℹ️',
      'achievement': '🏆',
      'trending': '🔥'
    };

    return icons[type as keyof typeof icons] || '✨';
  }

  /**
   * Get sound for notification
   */
  private getSoundForNotification(type: string): string {
    const sounds = {
      'success': 'success-chime',
      'warning': 'warning-bell',
      'info': 'info-notification',
      'achievement': 'achievement-fanfare',
      'trending': 'trending-alert'
    };

    return sounds[type as keyof typeof sounds] || 'default-notification';
  }

  /**
   * Get live statistics
   */
  getLiveStats(): {
    totalUsers: number;
    onlineUsers: number;
    totalEvents: number;
    totalInteractions: number;
    activeNotifications: number;
  } {
    return {
      totalUsers: this.users.size,
      onlineUsers: this.getOnlineUsersCount(),
      totalEvents: this.events.length,
      totalInteractions: this.interactions.length,
      activeNotifications: this.notifications.length
    };
  }

  /**
   * Stop the live system
   */
  stop(): void {
    this.isRunning = false;
    if (this.eventInterval) {
      clearInterval(this.eventInterval);
      this.eventInterval = null;
    }
  }
}

// Export singleton instance
export const liveInteractiveFeatures = new LiveInteractiveFeatures();

