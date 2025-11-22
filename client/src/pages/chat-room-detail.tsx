import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute } from 'wouter';
import { useWallet } from '@/hooks/use-wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Users, Lock, Globe, MessageCircle, Image, Video, FileText, Upload, X, Play, Download, Wifi, WifiOff, Shield, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChatRoomPasswordModal } from '@/components/chat-room-password-modal';
import { ChatInvitationNotification } from '@/components/chat-invitation-notification';
import { encryptionService } from '@/lib/encryption-service';

interface Message {
  id: string;
  content?: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isOwn: boolean;
  messageType: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  mediaFilename?: string;
  mediaSize?: number;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  description?: string;
  creator: {
    id: string;
    name: string;
    address: string;
  };
  participants: number;
  maxParticipants: number;
  isJoined: boolean;
  createdAt: Date;
}

export default function ChatRoomDetailPage() {
  const [, params] = useRoute('/chat-rooms/:roomId');
  const { user } = useWallet();
  const { toast } = useToast();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<{ enabled: boolean; hasKeys: boolean }>({ enabled: false, hasKeys: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roomId = params?.roomId;

  useEffect(() => {
    if (roomId) {
      loadChatRoom();
      loadMessages();
      initializeEncryption();
    }
  }, [roomId]);

  // Initialize encryption service
  const initializeEncryption = async () => {
    if (user?.id) {
      try {
        await encryptionService.initialize(user.id);
        const status = encryptionService.getEncryptionStatus();
        setEncryptionStatus(status);
        setEncryptionEnabled(status.enabled && status.hasKeys);
        console.log('🔐 Encryption initialized:', status);
      } catch (error) {
        console.error('❌ Failed to initialize encryption:', error);
        setEncryptionEnabled(false);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start real-time message polling
  useEffect(() => {
    if (roomId && chatRoom?.isJoined) {
      startMessagePolling();
    }
    
    return () => {
      stopMessagePolling();
    };
  }, [roomId, chatRoom?.isJoined]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle scroll detection
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setShowScrollButton(!isAtBottom && hasNewMessages);
    
    if (isAtBottom) {
      setHasNewMessages(false);
    }
  }, [hasNewMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Clear new message indicator when user scrolls to bottom
    setHasNewMessages(false);
  };

  const loadChatRoom = async () => {
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to load chat room');
      }
      const data = await response.json();
      setChatRoom(data);
    } catch (error) {
      console.error('Failed to load chat room:', error);
      toast({
        title: "Error",
        description: "Failed to load chat room",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = useCallback(async (isPolling = false) => {
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/messages?currentUserId=${user?.id || ''}&useEncryption=${encryptionEnabled}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      
      // Debug logging
      console.log('📨 Loaded messages:', data.map(msg => ({
        id: msg.id,
        content: msg.content?.substring(0, 20) + '...',
        senderId: msg.senderId,
        isOwn: msg.isOwn,
        currentUserId: user?.id
      })));
      
      // Reset retry count on successful load
      setRetryCount(0);
      setIsRetrying(false);
      
      // Check if there are new messages
      if (isPolling && data.length > lastMessageCount) {
        setHasNewMessages(true);
        setLastMessageCount(data.length);
        
        // Show notification for new messages (but not for own messages)
        const newMessages = data.slice(lastMessageCount);
        const hasOtherUserMessages = newMessages.some(msg => msg.senderId !== user?.id);
        
        if (hasOtherUserMessages) {
          toast({
            title: "💬 New message",
            description: `New message in ${chatRoom?.name}`,
          });
        }
      }
      
      // Force update messages to ensure isOwn is properly set
      // Also ensure isOwn is set correctly on the client side as a fallback
      const messagesWithOwnership = data.map(message => ({
        ...message,
        isOwn: message.senderId === user?.id
      }));
      
      setMessages(messagesWithOwnership);
      setLastMessageCount(data.length);
    } catch (error) {
      console.error('Failed to load messages:', error);
      
      if (!isPolling && retryCount < 3) {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 1000;
        retryTimeoutRef.current = setTimeout(() => {
          loadMessages(false);
        }, retryDelay);
        
        toast({
          title: "Connection Error",
          description: `Retrying to load messages... (${retryCount + 1}/3)`,
          variant: "destructive",
        });
      } else if (!isPolling) {
        toast({
          title: "Error",
          description: "Failed to load messages. Please refresh the page.",
          variant: "destructive",
        });
      }
    }
  }, [roomId, lastMessageCount, user?.id, chatRoom?.name, retryCount]);

  const startMessagePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll for new messages every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (isOnline) {
        loadMessages(true);
      }
    }, 2000);
  };

  const stopMessagePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user || sending) return;

    setSending(true);
    try {
      if (selectedFiles.length > 0) {
        await sendMediaMessage();
      } else {
        await sendTextMessage();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const sendTextMessage = async () => {
    const messageContent = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;
    
    // Optimistic UI update - add message immediately
    const optimisticMessage: Message = {
      id: tempMessageId,
      content: messageContent,
      senderId: user?.id || '',
      senderName: user?.displayName || 'You',
      timestamp: new Date(),
      isOwn: true,
      messageType: 'text',
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          senderId: user?.id,
          messageType: 'text',
          useEncryption: encryptionEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const message = await response.json();
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? message : msg
      ));
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setNewMessage(messageContent); // Restore message content
      throw error;
    }
  };

  const sendMediaMessage = async () => {
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', user?.id || '');
        formData.append('roomId', roomId || '');

        const response = await fetch(`/api/chat-rooms/${roomId}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const message = await response.json();
        setMessages(prev => [...prev, message]);
      }
      
      setSelectedFiles([]);
      if (newMessage.trim()) {
        setNewMessage('');
      }
    } catch (error) {
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const validTypes = ['image/', 'video/', 'audio/', 'application/'];
      return file.size <= maxSize && validTypes.some(type => file.type.startsWith(type));
    });

    if (validFiles.length !== fileArray.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were too large or invalid format",
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.isOwn;
    
    // Debug logging for message rendering
    console.log(`🎨 Rendering message ${message.id}: isOwn=${isOwn}, senderId=${message.senderId}, currentUserId=${user?.id}`);
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 transition-all duration-300 ease-out`}>
        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {message.senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-muted-foreground">
                {message.senderName}
              </span>
            </div>
          )}
          
          {isOwn && (
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                You
              </span>
            </div>
          )}
          
          <div
            className={`rounded-2xl p-4 shadow-sm relative premium-hover transition-all duration-300 ease-out ${
              isOwn
                ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground ml-auto border-l-4 border-primary/50 shadow-lg'
                : 'glass-card text-foreground mr-auto border-l-4 border-border/50'
            }`}
          >
            {isOwn && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full border-2 border-white shadow-sm" title="Your message"></div>
            )}
            
            {/* Debug indicator */}
            <div className={`absolute -top-1 -left-1 text-xs px-1 py-0.5 rounded ${
              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {isOwn ? 'YOU' : 'OTHER'}
            </div>
            {message.messageType === 'text' && message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {message.messageType === 'image' && message.mediaUrl && (
              <div className="space-y-2">
                <img 
                  src={message.mediaUrl} 
                  alt={message.mediaFilename || 'Image'}
                  className="max-w-full h-auto rounded-2xl cursor-pointer hover:opacity-90 transition-opacity shadow-lg premium-hover"
                  onClick={() => window.open(message.mediaUrl, '_blank')}
                />
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            {message.messageType === 'video' && message.mediaUrl && (
              <div className="space-y-2">
                <video 
                  src={message.mediaUrl}
                  controls
                  className="max-w-full h-auto rounded-2xl shadow-lg premium-hover"
                  poster={message.mediaUrl}
                />
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            {message.messageType === 'file' && message.mediaUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 glass-card rounded-2xl premium-hover">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.mediaFilename || 'File'}
                    </p>
                    {message.mediaSize && (
                      <p className="text-xs opacity-70">
                        {formatFileSize(message.mediaSize)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            <p className={`text-xs mt-2 ${
              isOwn ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const joinRoom = async () => {
    if (!user || !chatRoom) return;

    // Check if it's a private room that requires password
    if (chatRoom.type === 'private') {
      setShowPasswordModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      setChatRoom(prev => prev ? { ...prev, isJoined: true, participants: prev.participants + 1 } : null);
      toast({
        title: "Success",
        description: "Joined chat room successfully!",
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      toast({
        title: "Error",
        description: "Failed to join chat room",
        variant: "destructive",
      });
    }
  };

  const handlePasswordSuccess = () => {
    setChatRoom(prev => prev ? { ...prev, isJoined: true, participants: prev.participants + 1 } : null);
    setShowPasswordModal(false);
  };

  const leaveRoom = async () => {
    if (!user || !chatRoom) return;

    try {
      const response = await fetch(`/api/chat-rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave room');
      }

      setChatRoom(prev => prev ? { ...prev, isJoined: false, participants: prev.participants - 1 } : null);
      toast({
        title: "Success",
        description: "Left chat room successfully!",
      });
    } catch (error) {
      console.error('Failed to leave room:', error);
      toast({
        title: "Error",
        description: "Failed to leave chat room",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat room...</p>
        </div>
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Chat Room Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The chat room you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => window.history.back()} variant="glass">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => window.history.back()} 
            variant="glass" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat Rooms
          </Button>
          
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {chatRoom.name}
                      {hasNewMessages && (
                        <div className="h-2 w-2 bg-tertiary rounded-full animate-pulse" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={chatRoom.type === 'public' ? 'default' : 'secondary'}>
                        {chatRoom.type === 'public' ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </>
                        )}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {chatRoom.participants}/{chatRoom.maxParticipants}
                      </div>
                      {encryptionEnabled && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Connection Status */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isOnline ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <Button
                      onClick={() => loadMessages(false)}
                      size="sm"
                      variant="outline"
                      className="text-xs mobile-touch-target"
                    >
                      🔄 Refresh
                    </Button>
                  </div>
                  {chatRoom.isJoined ? (
                    <Button onClick={leaveRoom} variant="outline" size="sm" className="mobile-touch-target">
                      Leave Room
                    </Button>
                  ) : (
                    <Button onClick={joinRoom} size="sm" className="mobile-touch-target">
                      Join Room
                    </Button>
                  )}
                </div>
              </div>
              {chatRoom.description && (
                <p className="text-muted-foreground text-sm mt-2">{chatRoom.description}</p>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Messages Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 relative"
                  onScroll={handleScroll}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-20"></div>
                          <MessageCircle className="relative h-16 w-16 text-blue-500 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Welcome to {chatRoom?.name}!</h3>
                        <p className="text-muted-foreground mb-4">Start the conversation by sending a message</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Image className="h-4 w-4" />
                          <Video className="h-4 w-4" />
                          <FileText className="h-4 w-4" />
                          <span>Share photos, videos, and files</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.map(renderMessage)}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                  
                  {/* Scroll to bottom button */}
                  {showScrollButton && (
                    <div className="absolute bottom-4 right-4">
                      <Button
                        onClick={scrollToBottom}
                        size="sm"
                        variant="premium"
                        className="rounded-full shadow-lg"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        New messages
                      </Button>
                    </div>
                  )}
                  
                  {/* Retry indicator */}
                  {isRetrying && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                          Retrying connection... ({retryCount}/3)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                {chatRoom.isJoined ? (
                  <div 
                    className={`glass-card backdrop-blur-xl border-t border-border/50 p-4 transition-colors ${
                      dragActive ? 'bg-primary/10' : ''
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Selected Files ({selectedFiles.length})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFiles([])}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md text-xs">
                              {getFileIcon(file)}
                              <span className="truncate max-w-32">{file.name}</span>
                              <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-4 w-4 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={dragActive ? "Drop files here..." : "Type your message..."}
                          disabled={sending || uploading}
                          className="pr-20 mobile-touch-target"
                        />
                        {dragActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-md border-2 border-dashed border-primary">
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                              <p className="text-sm text-primary font-medium">Drop files here</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending || uploading}
                          className="px-3 mobile-touch-target"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          onClick={sendMessage} 
                          disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploading}
                          size="sm"
                          variant="premium"
                          className="mobile-touch-target"
                        >
                        {uploading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span>📷 Photos</span>
                        <span>🎥 Videos</span>
                        <span>📄 Files</span>
                      </div>
                      <span className="text-xs">Max 50MB per file</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      Join the room to start chatting
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Room Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Created by</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {chatRoom.creator.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{chatRoom.creator.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {chatRoom.creator.address.slice(0, 6)}...{chatRoom.creator.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Room Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={chatRoom.type === 'public' ? 'default' : 'secondary'} className="text-xs">
                        {chatRoom.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Participants:</span>
                      <span>{chatRoom.participants}/{chatRoom.maxParticipants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(chatRoom.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Password Modal */}
      {showPasswordModal && chatRoom && (
        <ChatRoomPasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordSuccess}
          roomId={roomId || ''}
          roomName={chatRoom.name}
          userId={user?.id || ''}
        />
      )}
      
      {/* Invitation Notifications */}
      {user && (
        <ChatInvitationNotification
          userId={user.id}
          className="fixed top-4 right-4 z-50 max-w-sm"
        />
      )}
    </div>
  );
}
