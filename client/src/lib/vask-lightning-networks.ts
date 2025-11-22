import { vaskDNASystem } from './vask-dna-system';

// Vask Lightning Networks - World's First Blockchain-Secured Instant Messaging
export interface LightningChannel {
  id: string;
  participants: string[]; // User addresses
  creator: string;
  status: ChannelStatus;
  balance: ChannelBalance;
  messages: LightningMessage[];
  createdAt: Date;
  lastActivity: Date;
  autoCloseTimeout: number; // Hours of inactivity before auto-close
  securityLevel: SecurityLevel;
  encryptionKey?: string;
}

export interface ChannelBalance {
  totalStaked: number;
  participantBalances: Map<string, number>;
  messageFees: Map<string, number>; // Per-message fees
}

export interface LightningMessage {
  id: string;
  sender: string;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  isEncrypted: boolean;
  blockchainProof?: string;
  dna?: string; // Reference to DNA system for message evolution
  reactions: MessageReaction[];
  isDelivered: boolean;
  deliveryProof?: string;
}

export interface MessageReaction {
  userId: string;
  reactionType: string;
  timestamp: Date;
  stakeAmount: number; // VSK tokens staked on reaction
}

export interface ChannelInvitation {
  id: string;
  channelId: string;
  inviter: string;
  invitee: string;
  stakeAmount: number;
  expiresAt: Date;
  isAccepted: boolean;
  blockchainProof: string;
}

export interface ChannelStats {
  totalMessages: number;
  activeChannels: number;
  totalStaked: number;
  averageMessageLatency: number;
  encryptionRate: number;
}

export type ChannelStatus = 'pending' | 'active' | 'closing' | 'closed' | 'disputed';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'crypto' | 'prediction';
export type SecurityLevel = 'basic' | 'enhanced' | 'military' | 'quantum';

export class VaskLightningNetworks {
  private static instance: VaskLightningNetworks;
  private channels: Map<string, LightningChannel> = new Map();
  private invitations: Map<string, ChannelInvitation> = new Map();
  private messageQueue: Map<string, LightningMessage[]> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private stats: ChannelStats;

  static getInstance(): VaskLightningNetworks {
    if (!VaskLightningNetworks.instance) {
      VaskLightningNetworks.instance = new VaskLightningNetworks();
    }
    return VaskLightningNetworks.instance;
  }

  constructor() {
    this.stats = {
      totalMessages: 0,
      activeChannels: 0,
      totalStaked: 0,
      averageMessageLatency: 0,
      encryptionRate: 0
    };
    this.startChannelMonitor();
  }

  // Create a new lightning channel
  async createLightningChannel(
    creator: string,
    participants: string[],
    stakeAmount: number,
    securityLevel: SecurityLevel = 'enhanced',
    autoCloseHours: number = 24
  ): Promise<LightningChannel> {
    const channelId = this.generateChannelId();
    
    // Validate participants
    if (participants.length < 1 || participants.length > 10) {
      throw new Error('Channel must have 1-10 participants');
    }

    // Check if creator has sufficient stake
    if (stakeAmount <= 0) {
      throw new Error('Stake amount must be greater than 0');
    }

    const participantBalances = new Map<string, number>();
    const messageFees = new Map<string, number>();
    
    // Initialize balances (creator stakes more)
    participantBalances.set(creator, stakeAmount);
    messageFees.set(creator, 0);
    
    participants.forEach(participant => {
      if (participant !== creator) {
        participantBalances.set(participant, 0);
        messageFees.set(participant, 0);
      }
    });

    const channel: LightningChannel = {
      id: channelId,
      participants: [creator, ...participants],
      creator,
      status: 'pending',
      balance: {
        totalStaked: stakeAmount,
        participantBalances,
        messageFees
      },
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      autoCloseTimeout: autoCloseHours,
      securityLevel,
      encryptionKey: securityLevel !== 'basic' ? this.generateEncryptionKey() : undefined
    };

    this.channels.set(channelId, channel);
    this.updateStats();
    this.emit('channelCreated', channel);
    
    // Send invitations to participants
    for (const participant of participants) {
      await this.sendChannelInvitation(channelId, creator, participant, stakeAmount / participants.length);
    }

    return channel;
  }

  // Send a message through lightning channel
  async sendLightningMessage(
    channelId: string,
    sender: string,
    content: string,
    messageType: MessageType = 'text'
  ): Promise<LightningMessage> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Lightning channel not found');
    }

    if (!channel.participants.includes(sender)) {
      throw new Error('Sender not authorized in this channel');
    }

    if (channel.status !== 'active') {
      throw new Error('Channel is not active');
    }

    // Check if sender has sufficient balance for message fee
    const messageFee = this.calculateMessageFee(channel, messageType);
    const senderBalance = channel.balance.participantBalances.get(sender) || 0;
    
    if (senderBalance < messageFee) {
      throw new Error('Insufficient balance for message fee');
    }

    // Create message
    const message: LightningMessage = {
      id: this.generateMessageId(),
      sender,
      content,
      messageType,
      timestamp: new Date(),
      isEncrypted: channel.securityLevel !== 'basic',
      blockchainProof: await this.generateBlockchainProof(channel, content),
      dna: this.generateMessageDNA(content, messageType),
      reactions: [],
      isDelivered: false,
      deliveryProof: undefined
    };

    // Deduct message fee
    channel.balance.participantBalances.set(sender, senderBalance - messageFee);
    channel.balance.messageFees.set(sender, (channel.balance.messageFees.get(sender) || 0) + messageFee);

    // Add message to channel
    channel.messages.push(message);
    channel.lastActivity = new Date();

    // Update stats
    this.stats.totalMessages++;
    this.updateAverageLatency();

    // Queue message for delivery
    this.queueMessage(channelId, message);

    this.emit('messageSent', { channel, message });
    return message;
  }

  // Receive a message (instant delivery)
  async receiveLightningMessage(
    channelId: string,
    messageId: string,
    recipient: string
  ): Promise<LightningMessage | null> {
    const channel = this.channels.get(channelId);
    if (!channel) return null;

    const message = channel.messages.find(m => m.id === messageId);
    if (!message) return null;

    // Mark as delivered
    message.isDelivered = true;
    message.deliveryProof = await this.generateDeliveryProof(channel, message, recipient);

    // Update channel activity
    channel.lastActivity = new Date();

    this.emit('messageReceived', { channel, message, recipient });
    return message;
  }

  // Add reaction to a message
  async addMessageReaction(
    channelId: string,
    messageId: string,
    userId: string,
    reactionType: string,
    stakeAmount: number = 0
  ): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const message = channel.messages.find(m => m.id === messageId);
    if (!message) return false;

    // Check if user is in channel
    if (!channel.participants.includes(userId)) return false;

    // Check if user has sufficient balance for stake
    if (stakeAmount > 0) {
      const userBalance = channel.balance.participantBalances.get(userId) || 0;
      if (userBalance < stakeAmount) return false;

      // Deduct stake
      channel.balance.participantBalances.set(userId, userBalance - stakeAmount);
    }

    const reaction: MessageReaction = {
      userId,
      reactionType,
      timestamp: new Date(),
      stakeAmount
    };

    message.reactions.push(reaction);
    channel.lastActivity = new Date();

    this.emit('reactionAdded', { channel, message, reaction });
    return true;
  }

  // Accept channel invitation
  async acceptChannelInvitation(
    invitationId: string,
    invitee: string,
    stakeAmount: number
  ): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    if (invitation.invitee !== invitee) return false;
    if (invitation.expiresAt < new Date()) return false;
    if (invitation.isAccepted) return false;

    const channel = this.channels.get(invitation.channelId);
    if (!channel) return false;

    // Add stake to channel
    const currentBalance = channel.balance.participantBalances.get(invitee) || 0;
    channel.balance.participantBalances.set(invitee, currentBalance + stakeAmount);
    channel.balance.totalStaked += stakeAmount;

    // Mark invitation as accepted
    invitation.isAccepted = true;

    // Check if all invitations are accepted
    const allInvitations = Array.from(this.invitations.values())
      .filter(inv => inv.channelId === invitation.channelId);
    
    const allAccepted = allInvitations.every(inv => inv.isAccepted);
    if (allAccepted) {
      channel.status = 'active';
      this.emit('channelActivated', channel);
    }

    this.emit('invitationAccepted', { invitation, channel });
    return true;
  }

  // Close lightning channel
  async closeLightningChannel(
    channelId: string,
    requester: string
  ): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Only creator or all participants can close
    const canClose = channel.creator === requester || 
                    channel.participants.every(p => p === requester);

    if (!canClose) return false;

    channel.status = 'closing';
    
    // Distribute remaining balance proportionally
    await this.distributeChannelBalance(channel);
    
    channel.status = 'closed';
    this.updateStats();
    
    this.emit('channelClosed', channel);
    return true;
  }

  // Get channel by ID
  getLightningChannel(channelId: string): LightningChannel | undefined {
    return this.channels.get(channelId);
  }

  // Get user's channels
  getUserChannels(userId: string): LightningChannel[] {
    return Array.from(this.channels.values())
      .filter(channel => channel.participants.includes(userId));
  }

  // Get channel messages
  getChannelMessages(channelId: string, limit: number = 50): LightningMessage[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    return channel.messages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get channel stats
  getChannelStats(): ChannelStats {
    return { ...this.stats };
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
  private async sendChannelInvitation(
    channelId: string,
    inviter: string,
    invitee: string,
    stakeAmount: number
  ): Promise<void> {
    const invitationId = this.generateInvitationId();
    
    const invitation: ChannelInvitation = {
      id: invitationId,
      channelId,
      inviter,
      invitee,
      stakeAmount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isAccepted: false,
      blockchainProof: await this.generateBlockchainProof(null, `invitation_${invitationId}`)
    };

    this.invitations.set(invitationId, invitation);
    this.emit('invitationSent', invitation);
  }

  private calculateMessageFee(channel: LightningChannel, messageType: MessageType): number {
    const baseFee = 1; // 1 VSK base fee
    
    const typeMultipliers: Record<MessageType, number> = {
      'text': 1,
      'image': 2,
      'audio': 3,
      'video': 5,
      'file': 4,
      'crypto': 2,
      'prediction': 3
    };

    const securityMultipliers: Record<SecurityLevel, number> = {
      'basic': 1,
      'enhanced': 1.5,
      'military': 2,
      'quantum': 3
    };

    return baseFee * typeMultipliers[messageType] * securityMultipliers[channel.securityLevel];
  }

  private async generateBlockchainProof(channel: LightningChannel | null, content: string): Promise<string> {
    // Simulate blockchain proof generation
    const proofData = {
      timestamp: Date.now(),
      contentHash: this.hashContent(content),
      channelId: channel?.id || 'global'
    };
    
    return `proof_${JSON.stringify(proofData).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private generateMessageDNA(content: string, messageType: MessageType): string {
    const dna = vaskDNASystem.generateDNA(content, { messageType }, {
      chainId: 1,
      blockNumber: Date.now(),
      timestamp: Date.now()
    });
    return dna.id;
  }

  private async generateDeliveryProof(
    channel: LightningChannel,
    message: LightningMessage,
    recipient: string
  ): Promise<string> {
    const proofData = {
      messageId: message.id,
      channelId: channel.id,
      recipient,
      deliveredAt: Date.now(),
      blockchainProof: message.blockchainProof
    };
    
    return `delivery_${JSON.stringify(proofData).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private generateEncryptionKey(): string {
    return `enc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async distributeChannelBalance(channel: LightningChannel): Promise<void> {
    // Simplified balance distribution - in production, this would use smart contracts
    const totalBalance = channel.balance.totalStaked;
    const participantCount = channel.participants.length;
    const perParticipant = totalBalance / participantCount;

    for (const participant of channel.participants) {
      // In a real implementation, this would trigger blockchain transactions
      console.log(`Distributing ${perParticipant} VSK to ${participant}`);
    }
  }

  private queueMessage(channelId: string, message: LightningMessage): void {
    if (!this.messageQueue.has(channelId)) {
      this.messageQueue.set(channelId, []);
    }
    this.messageQueue.get(channelId)!.push(message);
  }

  private startChannelMonitor(): void {
    // Monitor channels for auto-close
    setInterval(() => {
      const now = new Date();
      for (const [channelId, channel] of this.channels) {
        if (channel.status === 'active') {
          const hoursSinceActivity = (now.getTime() - channel.lastActivity.getTime()) / (1000 * 60 * 60);
          if (hoursSinceActivity >= channel.autoCloseTimeout) {
            this.closeLightningChannel(channelId, channel.creator);
          }
        }
      }
    }, 60000); // Check every minute
  }

  private updateStats(): void {
    this.stats.activeChannels = Array.from(this.channels.values())
      .filter(channel => channel.status === 'active').length;
    
    this.stats.totalStaked = Array.from(this.channels.values())
      .reduce((sum, channel) => sum + channel.balance.totalStaked, 0);
    
    this.stats.encryptionRate = Array.from(this.channels.values())
      .filter(channel => channel.securityLevel !== 'basic').length / 
      Math.max(1, this.channels.size) * 100;
  }

  private updateAverageLatency(): void {
    // Simulate latency calculation
    this.stats.averageMessageLatency = Math.random() * 100; // Mock latency in ms
  }

  private hashContent(content: string): string {
    // Simple hash function - in production, use crypto library
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private generateChannelId(): string {
    return `lightning_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateInvitationId(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}

// Export singleton instance
export const vaskLightningNetworks = VaskLightningNetworks.getInstance();

