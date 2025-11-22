import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LogOut, 
  Users, 
  Shield, 
  Search, 
  RefreshCw, 
  Calendar,
  User,
  Mail,
  Wallet,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Activity,
  Download,
  Upload,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  FileText,
  Globe,
  Lock,
  Unlock,
  Gift,
  History,
  Play,
  Square,
  Sparkles,
  Dna,
  Zap,
  Clock,
  Layers,
  MessageCircle,
  Music
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  uniqueId: string;
  walletAddress: string;
  ensName?: string;
  displayName?: string;
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  lastLogin?: string;
}

interface Vask {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  likes: number;
  comments: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  totalVotes: number;
  status: 'active' | 'resolved' | 'expired';
}


interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  creatorId: string;
  creatorName?: string;
  participants: number;
  maxParticipants: number;
  createdAt: string;
  lastActivity?: string;
}

interface Analytics {
  totalUsers: number;
  totalVasks: number;
  totalPolls: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalLikes: number;
  totalComments: number;
  totalVotes: number;
}

interface DistributionStats {
  totalUsers: number;
  eligibleUsers: number;
  totalTokensNeeded: number;
  adminWalletAddress: string;
  distributionAmount: number;
  lastDistribution: string | null;
}

interface DistributionHistory {
  id: string;
  timestamp: string;
  adminUser: string;
  totalUsers: number;
  amountPerUser: number;
  totalTokensDistributed: number;
  status: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [vasks, setVasks] = useState<Vask[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredVasks, setFilteredVasks] = useState<Vask[]>([]);
  const [filteredPolls, setFilteredPolls] = useState<Poll[]>([]);
  const [filteredChatRooms, setFilteredChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedVask, setSelectedVask] = useState<Vask | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    checkAuthStatus();
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "vasks") {
      fetchVasks();
    } else if (activeTab === "polls") {
      fetchPolls();
    } else if (activeTab === "chat-rooms") {
      fetchChatRooms();
    } else if (activeTab === "dashboard") {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.ensName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/admin/status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.adminUser);
      } else {
        setLocation("/admin/login");
      }
    } catch (error) {
      setLocation("/admin/login");
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchVasks(),
      fetchPolls(),
      fetchChatRooms(),
      fetchAnalytics()
    ]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } else {
        setError("Failed to fetch users");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const fetchVasks = async () => {
    try {
      const response = await fetch("/api/admin/vasks", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setVasks(data);
        setFilteredVasks(data);
      } else {
        setError("Failed to fetch vasks");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const fetchPolls = async () => {
    try {
      const response = await fetch("/api/admin/polls", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setPolls(data);
        setFilteredPolls(data);
      } else {
        setError("Failed to fetch polls");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };


  const fetchChatRooms = async () => {
    try {
      const response = await fetch("/api/chat-rooms", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setChatRooms(data);
        setFilteredChatRooms(data);
      } else {
        setError("Failed to fetch chat rooms");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/analytics", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        setError("Failed to fetch analytics");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };



  // CRUD Operations
  const handleEditUser = async (userData: any) => {
    try {
      const response = await fetch(`/api/admin/users/${selectedUser?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        setSuccess("User updated successfully");
        fetchUsers();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setEditFormData({});
      } else {
        setError("Failed to update user");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${selectedUser?.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("User deleted successfully");
        fetchUsers();
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      } else {
        setError("Failed to delete user");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleDeleteVask = async (vaskId: string) => {
    try {
      const response = await fetch(`/api/admin/vasks/${vaskId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Vask deleted successfully");
        fetchVasks();
      } else {
        setError("Failed to delete vask");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Poll deleted successfully");
        fetchPolls();
      } else {
        setError("Failed to delete poll");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };


  const handleDeleteChatRoom = async (roomId: string) => {
    try {
      console.log('🗑️ Attempting to delete chat room:', roomId);
      
      const response = await fetch(`/api/admin/chat-rooms/${roomId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log('📡 Delete response status:', response.status, response.statusText);

      if (response.ok) {
        setSuccess("Chat room deleted successfully");
        fetchChatRooms();
      } else {
        const errorText = await response.text();
        console.error('❌ Delete failed:', response.status, errorText);
        setError(`Failed to delete chat room: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkDelete = async (type: string, ids: string[]) => {
    try {
      const response = await fetch(`/api/admin/bulk-delete/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        setSuccess(`Bulk delete completed for ${ids.length} items`);
        if (type === "users") fetchUsers();
        else if (type === "vasks") fetchVasks();
        else if (type === "polls") fetchPolls();
      } else {
        setError("Failed to perform bulk delete");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleExportData = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/export/${type}`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`${type} data exported successfully`);
      } else {
        setError("Failed to export data");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A1A] via-[#1A1A2E] to-[#16213E] relative overflow-hidden">
      {/* Ethereal Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-[#8B5CF6] rounded-full animate-ethereal-1 animate-ethereal-glow"></div>
        <div className="absolute top-20 right-16 w-1 h-1 bg-[#A855F7] rounded-full animate-ethereal-2 animate-ethereal-glow"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-[#7C3AED] rounded-full animate-ethereal-3 animate-ethereal-glow"></div>
        <div className="absolute bottom-10 right-10 w-1.5 h-1.5 bg-[#9333EA] rounded-full animate-ethereal-4 animate-ethereal-glow"></div>
      </div>

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide truncate">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-[#ADD8E6]/70 hidden sm:block">VasukiiMicroblog Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-white font-medium">{adminUser?.username}</p>
                <p className="text-xs text-[#ADD8E6]/70">Administrator</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-[#ADD8E6]/30 text-white hover:bg-[#ADD8E6]/10 backdrop-blur-sm h-8 px-2 sm:h-9 sm:px-3"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/20 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <AlertDescription className="text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/20 backdrop-blur-sm">
            <XCircle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 bg-white/5 backdrop-blur-xl border border-white/10 p-1 gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="vasks" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Vasks
            </TabsTrigger>
            <TabsTrigger value="polls" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Polls
            </TabsTrigger>
            <TabsTrigger value="chat-rooms" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Chat Rooms</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="revolutionary" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Revolutionary</span>
              <span className="sm:hidden">Rev</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-white text-xs sm:text-sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            {analytics && (
              <>
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.totalUsers}</p>
                          <p className="text-sm text-[#ADD8E6]/70">Total Users</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                </div>
                      <div className="mt-4 flex items-center text-xs text-green-400">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{analytics.newUsersToday} today
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.totalVasks}</p>
                          <p className="text-sm text-[#ADD8E6]/70">Total Vasks</p>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-xl">
                          <MessageSquare className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-xs text-[#ADD8E6]/70">
                        <Activity className="w-3 h-3 mr-1" />
                        {analytics.totalLikes} total likes
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.totalPolls}</p>
                          <p className="text-sm text-[#ADD8E6]/70">Active Polls</p>
                </div>
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                          <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>
                      <div className="mt-4 flex items-center text-xs text-[#ADD8E6]/70">
                        <Activity className="w-3 h-3 mr-1" />
                        {analytics.totalVotes} total votes
                      </div>
            </CardContent>
          </Card>

                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.activeUsers}</p>
                          <p className="text-sm text-[#ADD8E6]/70">Active Users</p>
                </div>
                        <div className="p-3 bg-orange-500/20 rounded-xl">
                          <Activity className="w-6 h-6 text-orange-400" />
                </div>
              </div>
                      <div className="mt-4 flex items-center text-xs text-[#ADD8E6]/70">
                        <Users className="w-3 h-3 mr-1" />
                        {analytics.newUsersThisWeek} this week
                      </div>
            </CardContent>
          </Card>

                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.totalPolls || 0}</p>
                          <p className="text-sm text-[#ADD8E6]/70">Polls</p>
                </div>
                        <div className="p-3 bg-cyan-500/20 rounded-xl">
                          <Clock className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
                        <div className="mt-4 flex items-center text-xs text-[#ADD8E6]/70">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          {analytics.totalVotes || 0} total votes
                        </div>
            </CardContent>
          </Card>
        </div>

                {/* Quick Actions */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Database className="w-5 h-5 mr-2" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        onClick={() => handleExportData('users')}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Users
                      </Button>
                      <Button
                        onClick={() => handleExportData('vasks')}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Vasks
                      </Button>
                      <Button
                        onClick={() => handleExportData('polls')}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Polls
                      </Button>
                </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      User Management
                    </CardTitle>
                    <CardDescription className="text-[#ADD8E6]/70">
                      Manage all registered users
                    </CardDescription>
              </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExportData('users')}
                      variant="outline"
                      size="sm"
                      className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
              <Button
                onClick={fetchUsers}
                disabled={isLoading}
                variant="outline"
                      size="sm"
                      className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
                </div>
          </CardHeader>
          <CardContent>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ADD8E6]/50 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-[#ADD8E6]/50"
                    />
                  </div>
                </div>

                {/* Users Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                      <TableRow className="border-white/10">
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Wallet Address</TableHead>
                      <TableHead className="text-white">Joined</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.displayName || user.uniqueId}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">
                                {user.displayName || user.uniqueId}
                              </p>
                                <p className="text-sm text-[#ADD8E6]/70">@{user.uniqueId}</p>
                              </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                              <Wallet className="w-4 h-4 text-[#ADD8E6]/50" />
                            <span className="text-white font-mono text-sm">
                              {truncateAddress(user.walletAddress)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-[#ADD8E6]/50" />
                            <span className="text-white text-sm">
                              {formatDate(user.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-green-500/30 text-green-300">
                            Active
                          </Badge>
                        </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditFormData(user);
                                  setIsEditDialogOpen(true);
                                }}
                                className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredUsers.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                      <Users className="w-12 h-12 text-[#ADD8E6]/50 mx-auto mb-4" />
                      <p className="text-[#ADD8E6]/70">
                      {searchTerm ? "No users found matching your search." : "No users found."}
                    </p>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vasks Tab */}
          <TabsContent value="vasks" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Vask Management
                    </CardTitle>
                    <CardDescription className="text-[#ADD8E6]/70">
                      Manage all user posts
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fetchVasks}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredVasks.map((vask) => (
                    <div key={vask.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white mb-2">{vask.content}</p>
                          <div className="flex items-center space-x-4 text-sm text-[#ADD8E6]/70">
                            <span>Author: {vask.authorName}</span>
                            <span>Likes: {vask.likes}</span>
                            <span>Comments: {vask.comments}</span>
                            <span>{formatDate(vask.createdAt)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteVask(vask.id)}
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Poll Management
                    </CardTitle>
                    <CardDescription className="text-[#ADD8E6]/70">
                      Manage all prediction polls
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fetchPolls}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredPolls.map((poll) => (
                    <div key={poll.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white mb-2 font-medium">{poll.question}</p>
                          <div className="mb-2">
                            {Array.isArray(poll.options) && poll.options.map((option, index) => (
                              <div key={index} className="text-sm text-[#ADD8E6]/70">
                                {String.fromCharCode(65 + index)}. {option}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-[#ADD8E6]/70">
                            <span>Creator: {poll.creatorName}</span>
                            <span>Votes: {poll.totalVotes}</span>
                            <Badge variant="outline" className={
                              poll.status === 'active' ? 'border-green-500/30 text-green-300' :
                              poll.status === 'resolved' ? 'border-blue-500/30 text-blue-300' :
                              'border-gray-500/30 text-gray-300'
                            }>
                              {poll.status}
                            </Badge>
                            <span>{formatDate(poll.createdAt)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePoll(poll.id)}
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Rooms Tab */}
          <TabsContent value="chat-rooms" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Chat Room Management
                    </CardTitle>
                    <CardDescription className="text-[#ADD8E6]/70">
                      Manage all chat rooms and their participants
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExportData('chat-rooms')}
                      variant="outline"
                      size="sm"
                      className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      onClick={fetchChatRooms}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="border-[#ADD8E6]/30 text-[#ADD8E6] hover:bg-[#ADD8E6]/10"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredChatRooms.map((room) => (
                    <div key={room.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-medium">{room.name}</h3>
                            <Badge variant="outline" className={
                              room.type === 'public' ? 'border-green-500/30 text-green-300' : 'border-blue-500/30 text-blue-300'
                            }>
                              {room.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-[#ADD8E6]/70 mb-3">
                            <div>
                              <span className="font-medium">Creator:</span>
                              <div>{room.creatorName || 'Unknown'}</div>
                            </div>
                            <div>
                              <span className="font-medium">Participants:</span>
                              <div>{room.participants}/{room.maxParticipants}</div>
                            </div>
                            <div>
                              <span className="font-medium">Created:</span>
                              <div>{formatDate(room.createdAt)}</div>
                            </div>
                          </div>

                          {room.lastActivity && (
                            <div className="text-sm text-[#ADD8E6]/70">
                              <span className="font-medium">Last Activity:</span> {formatDate(room.lastActivity)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteChatRoom(room.id)}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Settings
                </CardTitle>
                <CardDescription className="text-[#ADD8E6]/70">
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-4">Data Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleExportData('all')}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export All Data
                      </Button>
                      <Button
                        variant="outline"
                        className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Clear All Data
                      </Button>
                    </div>
                  </div>
                </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Revolutionary Features Tab */}
          <TabsContent value="revolutionary" className="mt-6">
            <div className="space-y-6">
              {/* Revolutionary Features Overview */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Revolutionary Features Management
                  </CardTitle>
                  <CardDescription className="text-[#ADD8E6]/70">
                    Monitor and manage the 2 revolutionary features that make Vasukii unique
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Lightning Network</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Instant messaging with blockchain technology</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-800 dark:text-green-200">Lightning Chat</h3>
                            <p className="text-sm text-green-600 dark:text-green-400">Instant communication with media support</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Revolutionary Features Analytics */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Revolutionary Features Analytics
                  </CardTitle>
                  <CardDescription className="text-[#ADD8E6]/70">
                    Track usage and performance of revolutionary features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">{chatRooms.length}</div>
                      <div className="text-sm text-[#ADD8E6]/70">Chat Rooms</div>
                      <div className="text-xs text-[#ADD8E6]/50 mt-1">
                        {chatRooms.filter(c => c.type === 'public').length} public, {chatRooms.filter(c => c.type === 'private').length} private
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">0</div>
                      <div className="text-sm text-[#ADD8E6]/70">Lightning Chat Rooms</div>
                      <div className="text-xs text-[#ADD8E6]/50 mt-1">Public and private chat rooms</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Management Actions */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Feature Management
                  </CardTitle>
                  <CardDescription className="text-[#ADD8E6]/70">
                    Configure and manage revolutionary features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">Feature Status</h3>
                        <p className="text-sm text-[#ADD8E6]/70">All revolutionary features are currently active</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Analytics
                      </Button>
                      <Button variant="outline" className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                        <Download className="w-4 h-4 mr-2" />
                        Export Feature Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white/10 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User</DialogTitle>
              <DialogDescription className="text-[#ADD8E6]/70">
                Update user information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium">Display Name</label>
                <Input
                  value={editFormData.displayName || ''}
                  onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">Bio</label>
                <Textarea
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleEditUser(editFormData)}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-white/10 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Delete</DialogTitle>
              <DialogDescription className="text-[#ADD8E6]/70">
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}

