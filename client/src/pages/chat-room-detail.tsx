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
            className="mb-3 sm:mb-4 hover:scale-105 transition-all duration-300 bg-slate-800/90 dark:bg-slate-900/90 hover:bg-slate-700/90 dark:hover:bg-slate-800/90 shadow-lg hover:shadow-xl backdrop-blur-xl border-slate-700 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Chat Rooms</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          <Card className="glass-card bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-slate-700/50">
            <CardHeader className="border-b border-slate-700/50 p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg sm:rounded-xl shadow-lg hover:scale-110 transition-all duration-300 shrink-0">
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2 text-white font-bold truncate">
                      <span className="truncate">{chatRoom.name}</span>
                      {hasNewMessages && (
                        <div className="h-2 sm:h-2.5 w-2 sm:w-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-500/50 shrink-0" />
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                      <Badge variant={chatRoom.type === 'public' ? 'default' : 'secondary'} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all shadow-md text-white text-xs">
                        {chatRoom.type === 'public' ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            <span className="hidden xs:inline">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            <span className="hidden xs:inline">Private</span>
                          </>
                        )}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-blue-600/20 px-2 sm:px-3 py-1 rounded-full border border-blue-500/30">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                        <span className="font-medium text-blue-300">{chatRoom.participants}/{chatRoom.maxParticipants}</span>
                      </div>
                      {encryptionEnabled && (
                        <Badge variant="outline" className="text-green-400 border-green-500/50 bg-green-500/20 shadow-sm text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          <span className="hidden xs:inline">Encrypted</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Connection Status */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-green-600/20 border border-green-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                      {isOnline ? (
                        <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 animate-pulse" />
                      ) : (
                        <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      )}
                      <span className="text-xs sm:text-sm font-medium text-green-300">
                        {isOnline ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <Button
                      onClick={() => loadMessages(false)}
                      size="sm"
                      variant="outline"
                      className="text-xs mobile-touch-target hover:scale-110 transition-all duration-300 bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 text-blue-300"
                    >
                      🔄 <span className="hidden sm:inline ml-1">Refresh</span>
                    </Button>
                  </div>
                  {chatRoom.isJoined ? (
                    <Button onClick={leaveRoom} variant="outline" size="sm" className="mobile-touch-target border-red-500/50 text-red-400 hover:bg-red-600/20 hover:border-red-500 hover:scale-105 transition-all duration-300 shadow-md">
                      Leave Room
                    </Button>
                  ) : (
                    <Button onClick={joinRoom} size="sm" className="mobile-touch-target bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-white">
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
            <Card className="h-[500px] sm:h-[600px] flex flex-col bg-slate-900/95 backdrop-blur-xl shadow-2xl border-slate-700/50">
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 relative space-y-2 sm:space-y-3"
                  onScroll={handleScroll}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full px-4">
                      <div className="text-center max-w-md">
                        <div className="relative mb-6 sm:mb-8">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                          <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6 sm:p-8 rounded-full shadow-xl border border-purple-500/30">
                            <MessageCircle className="relative h-16 w-16 sm:h-20 sm:w-20 text-purple-400 mx-auto" />
                          </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white">Welcome to {chatRoom?.name}! 🚀</h3>
                        <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">Start the conversation by sending a message</p>
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm bg-slate-800/50 p-3 sm:p-4 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-1 text-blue-400">
                            <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-medium">Photos</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-400">
                            <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-medium">Videos</span>
                          </div>
                          <div className="flex items-center gap-1 text-pink-400">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-medium">Files</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(renderMessage)}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                  
                  {/* Scroll to bottom button */}
                  {showScrollButton && (
                    <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 animate-bounce">
                      <Button
                        onClick={scrollToBottom}
                        size="sm"
                        variant="premium"
                        className="rounded-full shadow-2xl hover:shadow-3xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-110 transition-all duration-300 text-white text-xs sm:text-sm"
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden xs:inline">New messages</span>
                        <span className="xs:hidden">New</span>
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
                    className={`border-t border-slate-700/50 bg-slate-800/95 backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all duration-300 ${
                      dragActive ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 scale-[1.01]' : ''
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 shadow-lg">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className="text-xs sm:text-sm font-bold text-white">Selected Files ({selectedFiles.length})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFiles([])}
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-red-600/20 hover:scale-110 transition-all"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-300 border border-slate-600/50">
                              {getFileIcon(file)}
                              <span className="truncate max-w-20 sm:max-w-32 font-medium text-slate-200">{file.name}</span>
                              <span className="text-slate-400 text-xs">{formatFileSize(file.size)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-4 w-4 sm:h-5 sm:w-5 p-0 hover:bg-red-600/20 hover:scale-110 transition-all"
                              >
                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={dragActive ? "Drop files here..." : "Type your message..."}
                          disabled={sending || uploading}
                          className="pr-20 mobile-touch-target h-11 sm:h-12 border-slate-600 focus:border-purple-500 bg-slate-700/80 text-white placeholder:text-slate-400 backdrop-blur-sm shadow-md focus:shadow-lg transition-all duration-300"
                        />
                        {dragActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-lg border-2 border-dashed border-purple-400 backdrop-blur-sm animate-pulse">
                            <div className="text-center">
                              <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-purple-300 mx-auto mb-2 animate-bounce" />
                              <p className="text-sm sm:text-base text-purple-200 font-bold">Drop files here</p>
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
                      
                      <div className="flex gap-2 sm:gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending || uploading}
                          className="px-3 sm:px-4 mobile-touch-target h-11 sm:h-12 bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30 hover:border-blue-500 hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                        </Button>
                        
                        <Button 
                          onClick={sendMessage} 
                          disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploading}
                          size="sm"
                          variant="premium"
                          className="mobile-touch-target h-11 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 text-white"
                        >
                        {uploading ? (
                          <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mt-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
                        <span className="flex items-center gap-1 text-blue-400 font-medium">📷 <span className="hidden xs:inline">Photos</span></span>
                        <span className="flex items-center gap-1 text-purple-400 font-medium">🎥 <span className="hidden xs:inline">Videos</span></span>
                        <span className="flex items-center gap-1 text-pink-400 font-medium">📄 <span className="hidden xs:inline">Files</span></span>
                      </div>
                      <span className="text-xs bg-slate-700/50 border border-slate-600/50 px-2 sm:px-3 py-1 rounded-full font-medium text-slate-300">Max 50MB</span>
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
            <Card className="bg-slate-800/95 backdrop-blur-xl shadow-2xl border-slate-700/50">
              <CardHeader className="border-b border-slate-700/50 p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-white">Room Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5 pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="bg-slate-700/50 p-3 sm:p-4 rounded-xl border border-slate-600/50">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-purple-400 text-sm sm:text-base">Created by</h4>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-purple-500/50 shadow-lg">
                      <AvatarFallback className="text-xs sm:text-sm bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
                        {chatRoom.creator.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{chatRoom.creator.name}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {chatRoom.creator.address.slice(0, 6)}...{chatRoom.creator.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 p-3 sm:p-4 rounded-xl border border-slate-600/50">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-blue-400 text-sm sm:text-base">Room Details</h4>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Type:</span>
                      <Badge variant={chatRoom.type === 'public' ? 'default' : 'secondary'} className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                        {chatRoom.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Participants:</span>
                      <span className="font-bold text-blue-300">{chatRoom.participants}/{chatRoom.maxParticipants}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Created:</span>
                      <span className="font-bold text-purple-300">{new Date(chatRoom.createdAt).toLocaleDateString()}</span>
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
