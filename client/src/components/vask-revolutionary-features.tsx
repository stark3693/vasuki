import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { useWallet } from '@/hooks/use-wallet';
import { 
  Clock, 
  MessageCircle, 
  Sparkles
} from 'lucide-react';

// Import live systems
import { liveLightningNetwork } from '@/lib/live-lightning-network';
import { LiveNotifications, LiveActivityFeed, LiveUserCounter } from './live-notifications';
import { LiveDashboard } from './live-dashboard';
import { liveInteractiveFeatures } from '@/lib/live-interactive-features';

interface LightningChannel {
  id: string;
  participants: string[];
  message: string;
  capacity: number;
  latency: number;
}

interface RevolutionaryFeaturesProps {
  userAddress: string;
}

export function RevolutionaryFeatures({ userAddress }: RevolutionaryFeaturesProps) {
  const { user } = useWallet();
  
  // Get the user ID from the user object or use the walletAddress to find it
  const getUserId = () => {
    if (user?.id) return user.id;
    // If no user object, we'll need to fetch the user by wallet address
    return null;
  };
  const [activeTab, setActiveTab] = useState('lightning');
  const [lightningChannels, setLightningChannels] = useState<LightningChannel[]>([]);

  // Add user to live system when component mounts
  useEffect(() => {
    if (user && userAddress) {
      liveInteractiveFeatures.addUser({
        id: user.id || userAddress,
        name: user.displayName || user.ensName || 'Anonymous User',
        avatar: user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`,
        walletAddress: userAddress,
        level: Math.floor(Math.random() * 50) + 1,
        xp: Math.floor(Math.random() * 10000),
        badges: ['Early Adopter', 'Revolutionary Creator', 'Blockchain Pioneer'],
        status: 'online',
        lastSeen: new Date()
      });
    }
  }, [user, userAddress]);

  // Start live systems when component mounts
  useEffect(() => {
    // Start live systems for Lightning
    liveLightningNetwork.start();

    // Cleanup on unmount
    return () => {
      liveLightningNetwork.stop();
    };
  }, []);

  useEffect(() => {
    // Load initial data
    loadRevolutionaryContent();
  }, []);

  const loadRevolutionaryContent = async () => {
    // Load revolutionary content (simplified)
    setLightningChannels([]);
  };

  const createRevolutionaryVask = async (content: string, featureType: string) => {
    console.log('Creating revolutionary vask:', { content, featureType, user, userAddress });
    
    const userId = getUserId();
    if (!userId) {
      console.error('No user ID found - please connect your wallet');
      alert('❌ Please connect your wallet first!');
      return;
    }

    try {
      const requestData = {
        content: content,
        authorId: userId,
        isEncrypted: false
      };
      
      console.log('Sending request to /api/vasks with:', requestData);
      console.log('Content length:', content.length);
      console.log('Author ID:', userId);

      const response = await fetch('/api/vasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Revolutionary vask created successfully!', result);
        alert('🎉 Revolutionary feature post created successfully! Check your feed.');
        // Refresh the vasks list
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Failed to create revolutionary vask:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        alert(`❌ Failed to create post: ${errorData.message || 'Unknown error'}\n\nDetails: ${JSON.stringify(errorData, null, 2)}`);
      }
    } catch (error) {
      console.error('Error creating revolutionary vask:', error);
      alert(`❌ Error creating post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🚀 Revolutionary Features
        </h2>
        <p className="text-muted-foreground">
          Lightning Networks - World's first social media features powered by blockchain and AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="lightning" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Lightning Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lightning" className="space-y-4">
          <div className="text-center space-y-2 mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">
              ⚡ Create Lightning Chat Rooms
            </h3>
            <p className="text-sm text-muted-foreground">
              Build instant, blockchain-secured group chat rooms with public or private access
            </p>
          </div>
          <LightningNetworksPanel userAddress={userAddress} createRevolutionaryVask={createRevolutionaryVask} />
        </TabsContent>
      </Tabs>

      {/* Live Notifications - Always visible */}
      <LiveNotifications />
    </div>
  );
}





// Lightning Networks Panel
function LightningNetworksPanel({ userAddress, createRevolutionaryVask }: { userAddress: string; createRevolutionaryVask: (content: string, featureType: string) => Promise<void> }) {
  const [participants, setParticipants] = useState<string[]>([]);
  const [channelMessage, setChannelMessage] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [channelName, setChannelName] = useState('');
  const [channelPassword, setChannelPassword] = useState('');

  const sendInvitations = async (roomId: string, participantAddresses: string[], inviterAddress: string) => {
    try {
      // Get the current user ID from the inviter address
      const inviterResponse = await fetch(`/api/users/by-wallet/${inviterAddress}`);
      if (!inviterResponse.ok) {
        console.error('Failed to get inviter user ID');
        return;
      }
      const inviterUser = await inviterResponse.json();
      
      // Send invitations to each participant
      for (const participantAddress of participantAddresses) {
        try {
          // Get or create user for participant
          let participantUser;
          const participantResponse = await fetch(`/api/users/by-wallet/${participantAddress}`);
          
          if (participantResponse.ok) {
            participantUser = await participantResponse.json();
          } else {
            // Create user if doesn't exist
            const createUserResponse = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uniqueId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                walletAddress: participantAddress,
                displayName: `User ${participantAddress.slice(0, 6)}...${participantAddress.slice(-4)}`,
                ensName: null,
                bio: null,
                profileImage: null,
                coverImage: null,
                isEncrypted: false
              })
            });
            
            if (createUserResponse.ok) {
              participantUser = await createUserResponse.json();
            } else {
              console.error('Failed to create user for participant:', participantAddress);
              continue;
            }
          }
          
          // Send invitation
          const invitationResponse = await fetch(`/api/chat-rooms/${roomId}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inviterId: inviterUser.id,
              inviteeId: participantUser.id
            })
          });
          
          if (invitationResponse.ok) {
            console.log(`✅ Invitation sent to ${participantAddress}`);
          } else {
            console.error(`❌ Failed to send invitation to ${participantAddress}`);
          }
        } catch (error) {
          console.error(`❌ Error sending invitation to ${participantAddress}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error in sendInvitations:', error);
    }
  };

      const createLightningChannel = async () => {
        if (!channelMessage.trim() || !channelName.trim()) {
          alert('❌ Please enter both channel name and first message!');
          return;
        }
        
        if (channelType === 'private' && !channelPassword.trim()) {
          alert('❌ Please enter a password for your private chat room!');
          return;
        }
    
    try {
          // Create chat room via API
          const response = await fetch('/api/chat-rooms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: channelName,
              type: channelType,
              description: `Lightning Chat Room: ${channelName}`,
              creatorId: userAddress,
              firstMessage: channelMessage,
              password: channelType === 'private' ? channelPassword : undefined
            }),
          });

          console.log('🔍 Chat room creation response status:', response.status);
          console.log('🔍 Chat room creation response headers:', response.headers);
          console.log('🔍 Response content type:', response.headers.get('content-type'));

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Chat room creation failed:', errorText);
            throw new Error(`Failed to create chat room: ${response.status} ${errorText}`);
          }

          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('❌ Response is not JSON:', responseText);
            throw new Error(`Expected JSON response but got: ${contentType}`);
          }

          const result = await response.json();
          console.log('✅ Chat room created successfully:', result);
          
          // Send invitations to participants if any
          if (participants.length > 0) {
            console.log('📤 Sending invitations to participants:', participants);
            await sendInvitations(result.id, participants, userAddress);
          }
          
          // Create a real vask post about the lightning channel
          const lightningContent = `⚡ LIVE Lightning Chat Room Created!\n\n🏠 Channel Name: "${channelName}"\n🔒 Type: ${channelType === 'public' ? 'Public' : 'Private'}\n📊 Channel ID: ${result.id}\n👥 Participants: ${participants.length + 1}\n• You: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}\n${participants.map(p => `• ${p.slice(0, 6)}...${p.slice(-4)}`).join('\n')}\n\n💬 First Message: "${channelMessage.substring(0, 100)}${channelMessage.length > 100 ? '...' : ''}"\n\n⚡ Chat Room Specifications:\n• Capacity: 100 participants\n• Type: ${result.type}\n• Status: Active\n• Visibility: ${channelType === 'public' ? 'Anyone can join' : 'Invite only'}\n• Created: ${new Date().toLocaleString()}\n• Last Activity: ${new Date().toLocaleString()}\n\n🎯 Features:\n• ${channelType === 'public' ? '🌍 Public - Anyone can discover and join' : '🔒 Private - Only invited users can join'}\n• 💬 Group chat with ${participants.length + 1} participants\n• ⚡ Instant messaging with blockchain security\n• 🔄 Real-time message synchronization\n• 💰 Optional token rewards for active participants\n\nThis chat room enables instant, blockchain-secured group communication with live real-time messaging!\n\n#LightningNetworks #ChatRooms #GroupChat #RevolutionaryFeatures #LiveMessaging #Blockchain`;
          
          await createRevolutionaryVask(lightningContent, 'lightning-networks');
          
          // Show success message with chat room details
          alert(`🎉 Lightning Chat Room Created!\n\nChannel: "${channelName}"\nType: ${channelType}\nParticipants: ${participants.length + 1}\n\nYour chat room is now live and ready for group conversations!\n\nRedirecting to Chat Rooms...`);
          
          // Reset form
          setChannelName('');
          setChannelMessage('');
          setParticipants([]);
          setChannelType('public');
          
          // Redirect to chat rooms page after a short delay
          setTimeout(() => {
            window.location.href = '/chat-rooms';
          }, 2000);
    } catch (error) {
          console.error('Failed to create lightning channel:', error);
          alert(`❌ Failed to create chat room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Lightning Chat Rooms
          </CardTitle>
          <CardDescription>
            Create instant, blockchain-secured chat rooms with group messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chat Room Name</label>
            <Input
              placeholder="Enter a name for your chat room..."
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Room Type</label>
            <Select value={channelType} onValueChange={(value: 'public' | 'private') => setChannelType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌍 Public - Anyone can discover and join</SelectItem>
                <SelectItem value="private">🔒 Private - Password protected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channelType === 'private' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Password</label>
              <Input
                type="password"
                placeholder="Enter a password for your private room..."
                value={channelPassword}
                onChange={(e) => setChannelPassword(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                🔐 This password will be required for others to join your private chat room
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">First Message</label>
            <Textarea
              placeholder="Enter the first message for your chat room..."
              value={channelMessage}
              onChange={(e) => setChannelMessage(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invite Participants (Optional)</label>
            <Textarea
              placeholder="Enter wallet addresses separated by commas (leave empty for public room)"
              value={participants.join(', ')}
              onChange={(e) => setParticipants(e.target.value.split(',').map(addr => addr.trim()).filter(Boolean))}
              className="min-h-[60px]"
            />
            <div className="text-xs text-muted-foreground">
              {channelType === 'public' 
                ? "💡 Public rooms: Anyone can join, participants list is optional"
                : "🔒 Private rooms: Only invited participants can join"
              }
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            💡 Features: Group chat, real-time messaging, blockchain security, optional token rewards
          </div>

          <Button 
            onClick={createLightningChannel}
            disabled={!channelName.trim() || !channelMessage.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Create Lightning Chat Room
          </Button>

          <div className="text-xs text-muted-foreground">
            ⚡ Chat rooms support group messaging with instant blockchain-secured communication
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


