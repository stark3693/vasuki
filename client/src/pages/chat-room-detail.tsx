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
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
        <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? '' : ''}`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1.5 ml-1">
              <Avatar className="h-6 w-6 ring-2 ring-border">
                <AvatarFallback className="text-xs bg-muted">
                  {message.senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-muted-foreground">
                {message.senderName}
              </span>
            </div>
          )}
          
          <div
            className={`rounded-2xl px-4 py-3 shadow-md transition-all ${
              isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {message.messageType === 'text' && message.content && (
              <p className="text-sm leading-relaxed break-words">{message.content}</p>
            )}
            
            {message.messageType === 'image' && message.mediaUrl && (
              <div className="space-y-2">
                <img 
                  src={message.mediaUrl} 
                  alt={message.mediaFilename || 'Image'}
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                  className="max-w-full h-auto rounded-lg"
                />
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            {message.messageType === 'file' && message.mediaUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                  <FileText className="h-5 w-5" />
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
                    variant="ghost"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                    className="h-7 w-7 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            <p className={`text-xs mt-1.5 opacity-70`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-background via-primary/5 to-background border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <Button 
              onClick={() => window.history.back()} 
              variant="ghost" 
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            
            {/* Room Header Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary to-primary/50 rounded-xl shadow-lg">
                  <MessageCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{chatRoom.name}</h1>
                    {hasNewMessages && (
                      <div className="relative">
                        <div className="h-2.5 w-2.5 bg-success rounded-full animate-pulse" />
                        <div className="absolute inset-0 h-2.5 w-2.5 bg-success rounded-full animate-ping" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-primary font-medium">
                      {chatRoom.type === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {chatRoom.type}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md font-medium">
                      <Users className="h-3 w-3" />
                      {chatRoom.participants}/{chatRoom.maxParticipants}
                    </span>
                    {encryptionEnabled && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-success/10 rounded-md text-success font-medium">
                        <ShieldCheck className="h-3 w-3" />
                        Secure
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {chatRoom.isJoined ? (
                <Button onClick={leaveRoom} variant="outline" size="sm" className="hover:bg-destructive hover:text-destructive-foreground transition-all">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Leave
                </Button>
              ) : (
                <Button onClick={joinRoom} size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all">
                  Join Room
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Messages Area */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)] flex flex-col shadow-xl border-2 border-primary/10 overflow-hidden">
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-background via-background to-primary/5">
                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 scroll-smooth"
                  onScroll={handleScroll}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md space-y-4 p-8">
                        <div className="relative inline-block">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                          <div className="relative p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full">
                            <MessageCircle className="h-16 w-16 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold">Welcome to {chatRoom?.name}! 🎉</h3>
                          <p className="text-muted-foreground">Be the first to start the conversation</p>
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-4">
                          <div className="flex flex-col items-center gap-1 text-xs">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Image className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">Photos</span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-xs">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Video className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">Videos</span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-xs">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">Files</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map(renderMessage)
                  )}
                  <div ref={messagesEndRef} />
                  
                  {/* Scroll to bottom button */}
                  {showScrollButton && (
                    <div className="sticky bottom-4 flex justify-center pointer-events-none">
                      <Button
                        onClick={scrollToBottom}
                        size="sm"
                        className="pointer-events-auto shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground animate-bounce hover:animate-none"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        New messages
                      </Button>
                    </div>
                  )}
                  
                  {/* Retry indicator */}
                  {isRetrying && (
                    <div className="sticky top-4 flex justify-center">
                      <div className="bg-warning/10 border border-warning rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-warning border-t-transparent"></div>
                        <span>Retrying... ({retryCount}/3)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                {chatRoom.isJoined ? (
                  <div 
                    className={`border-t border-primary/20 p-4 bg-gradient-to-r from-background via-primary/5 to-background transition-all ${
                      dragActive ? 'bg-primary/10 border-primary/50' : ''
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFiles([])}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 bg-background px-2 py-1 rounded-md text-xs border">
                              {getFileIcon(file)}
                              <span className="truncate max-w-32">{file.name}</span>
                              <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-4 w-4 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={dragActive ? "Drop files here..." : "Type a message..."}
                          disabled={sending || uploading}
                          className="pr-10"
                        />
                        {dragActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg border-2 border-dashed border-primary">
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-primary mx-auto mb-1" />
                              <p className="text-sm font-medium">Drop files here</p>
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
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || uploading}
                        title="Attach files"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        onClick={sendMessage} 
                        disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploading}
                        size="icon"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      >
                        {uploading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>📷 Images</span>
                        <span>🎥 Videos</span>
                        <span>📄 Files</span>
                      </div>
                      <span>Max 50MB</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Join the room to start chatting
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Room Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-2 border-primary/10 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  Room Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2 p-3 bg-gradient-to-br from-primary/5 to-transparent rounded-lg border border-primary/10">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Created by</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/50 text-primary-foreground font-bold">
                        {chatRoom.creator.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{chatRoom.creator.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {chatRoom.creator.address.slice(0, 6)}...{chatRoom.creator.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-gradient-to-br from-accent/50 to-transparent rounded-lg border border-border">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Details</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={chatRoom.type === 'public' ? 'default' : 'secondary'}>
                        {chatRoom.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Participants:</span>
                      <span className="font-medium">{chatRoom.participants}/{chatRoom.maxParticipants}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{new Date(chatRoom.createdAt).toLocaleDateString()}</span>
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
