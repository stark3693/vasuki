export interface ChatUpdate {
  type: 'message' | 'typing' | 'user_joined' | 'user_left';
  roomId: string;
  data: any;
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

class LiveChatService {
  private static instance: LiveChatService;
  private subscribers: Set<(update: ChatUpdate) => void> = new Set();
  private isRunning = false;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private typingUsers: Map<string, TypingUser[]> = new Map();

  static getInstance(): LiveChatService {
    if (!LiveChatService.instance) {
      LiveChatService.instance = new LiveChatService();
    }
    return LiveChatService.instance;
  }

  startListening() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('💬 Live Chat Service Started');
  }

  stopListening() {
    this.isRunning = false;
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    console.log('💬 Live Chat Service Stopped');
  }

  onUpdate(callback: (update: ChatUpdate) => void) {
    this.subscribers.add(callback);
  }

  offUpdate(callback: (update: ChatUpdate) => void) {
    this.subscribers.delete(callback);
  }

  private notifyUpdate(update: ChatUpdate) {
    this.subscribers.forEach(callback => callback(update));
  }

  // Start polling for a specific room
  startRoomPolling(roomId: string, currentMessageCount: number) {
    if (this.pollingIntervals.has(roomId)) {
      clearInterval(this.pollingIntervals.get(roomId)!);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat-rooms/${roomId}/messages`);
        if (response.ok) {
          const messages = await response.json();
          
          if (messages.length > currentMessageCount) {
            const newMessages = messages.slice(currentMessageCount);
            
            newMessages.forEach((message: any) => {
              this.notifyUpdate({
                type: 'message',
                roomId,
                data: message,
                timestamp: Date.now()
              });
            });
            
            currentMessageCount = messages.length;
          }
        }
      } catch (error) {
        console.error('Chat polling error:', error);
      }
    }, 2000);

    this.pollingIntervals.set(roomId, interval);
  }

  // Stop polling for a specific room
  stopRoomPolling(roomId: string) {
    const interval = this.pollingIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(roomId);
    }
  }

  // Send typing indicator
  sendTypingIndicator(roomId: string, userId: string, userName: string) {
    this.notifyUpdate({
      type: 'typing',
      roomId,
      data: { userId, userName, timestamp: Date.now() },
      timestamp: Date.now()
    });

    // Add to typing users
    const typingList = this.typingUsers.get(roomId) || [];
    const existingIndex = typingList.findIndex(user => user.userId === userId);
    
    if (existingIndex >= 0) {
      typingList[existingIndex] = { userId, userName, timestamp: Date.now() };
    } else {
      typingList.push({ userId, userName, timestamp: Date.now() });
    }
    
    this.typingUsers.set(roomId, typingList);

    // Remove typing indicator after 3 seconds
    setTimeout(() => {
      const updatedList = this.typingUsers.get(roomId) || [];
      const filteredList = updatedList.filter(user => user.userId !== userId);
      this.typingUsers.set(roomId, filteredList);
    }, 3000);
  }

  // Get current typing users for a room
  getTypingUsers(roomId: string): TypingUser[] {
    const typingList = this.typingUsers.get(roomId) || [];
    // Filter out users who haven't typed in the last 5 seconds
    const now = Date.now();
    return typingList.filter(user => now - user.timestamp < 5000);
  }
}

export const liveChatService = LiveChatService.getInstance();

