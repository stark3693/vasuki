import { 
  type User, 
  type InsertUser, 
  type Vask, 
  type InsertVask, 
  type Like, 
  type InsertLike, 
  type Comment, 
  type InsertComment, 
  type UserSettings, 
  type InsertUserSettings,
  type Follow,
  type InsertFollow,
  type VaskWithAuthor,
  type CommentWithAuthor,
  type UserProfile,
  type AdminUser,
  type InsertAdminUser,
  type Poll,
  type InsertPoll,
  type PollVote,
  type InsertPollVote,
  type PollWithCreator,
  type UpdateUsername
} from "@shared/sqlite-schema";
import { randomUUID } from "crypto";
import { generateUniqueId } from "./utils/uniqueId";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUniqueId(uniqueId: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUsername(userId: string, newUsername: string): Promise<User | undefined>;
  isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;

  // Vask methods
  getVask(id: string, currentUserId?: string): Promise<VaskWithAuthor | undefined>;
  getVasks(limit?: number, offset?: number, currentUserId?: string): Promise<VaskWithAuthor[]>;
  getVasksByUser(userId: string, limit?: number, offset?: number, currentUserId?: string): Promise<VaskWithAuthor[]>;
  createVask(vask: InsertVask): Promise<Vask>;
  deleteVask(id: string, userId: string): Promise<boolean>;
  pinVask(id: string, userId: string): Promise<boolean>;
  unpinVask(userId: string): Promise<boolean>;

  // Like methods
  getLike(vaskId: string, userId: string): Promise<Like | undefined>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(vaskId: string, userId: string): Promise<boolean>;
  getLikedVasks(userId: string, limit?: number, offset?: number): Promise<VaskWithAuthor[]>;

  // Comment methods
  getComments(vaskId: string): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string, userId: string): Promise<boolean>;

  // Poll methods
  getPoll(id: string, currentUserId?: string): Promise<PollWithCreator | undefined>;
  getPolls(limit?: number, offset?: number, currentUserId?: string): Promise<PollWithCreator[]>;
  getPollsByUser(userId: string, limit?: number, offset?: number, currentUserId?: string): Promise<PollWithCreator[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  voteOnPoll(pollId: string, userId: string, option: number): Promise<boolean>;
  resolvePoll(pollId: string, correctOption: number, userId: string): Promise<boolean>;
  hasUserVoted(pollId: string, userAddress: string): Promise<boolean>;
  getUserVote(pollId: string, userAddress: string): Promise<{ option: number; timestamp: number } | null>;

  // Settings methods
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  updateUserSettings(userId: string, settings: InsertUserSettings): Promise<UserSettings>;

  // Follow methods
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollow(followerId: string, followingId: string): Promise<Follow | undefined>;
  getFollowers(userId: string, limit?: number, offset?: number): Promise<User[]>;
  getFollowing(userId: string, limit?: number, offset?: number): Promise<User[]>;
  getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }>;

  // Search methods
  searchUsers(query: string, limit?: number, offset?: number, currentUserId?: string): Promise<UserProfile[]>;
  
  // User suggestion methods
  getUserSuggestions(userId: string, limit?: number): Promise<UserProfile[]>;

  // Admin methods
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  getAdminUser(username: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  updateAdminLastLogin(username: string): Promise<void>;
  updateAdminPassword(username: string, newPasswordHash: string): Promise<void>;
  clearAdminUsers(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private vasks: Map<string, Vask>;
  private likes: Map<string, Like>;
  private comments: Map<string, Comment>;
  private userSettings: Map<string, UserSettings>;
  private follows: Map<string, Follow>;
  private adminUsers: Map<string, AdminUser>;
  private polls: Map<string, Poll>;
  private pollVotes: Map<string, PollVote>;

  constructor() {
    this.users = new Map();
    this.vasks = new Map();
    this.likes = new Map();
    this.comments = new Map();
    this.userSettings = new Map();
    this.follows = new Map();
    this.adminUsers = new Map();
    this.polls = new Map();
    this.pollVotes = new Map();
  }


  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.uniqueId === uniqueId,
    );
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Generate a unique ID if not provided
    let uniqueId = insertUser.uniqueId;
    if (!uniqueId) {
      const existingUniqueIds = Array.from(this.users.values()).map(u => u.uniqueId);
      do {
        uniqueId = generateUniqueId();
      } while (existingUniqueIds.includes(uniqueId));
    }
    
    const user: User = { 
      ...insertUser, 
      id, 
      uniqueId,
      createdAt: new Date(),
      displayName: insertUser.displayName || null,
      ensName: insertUser.ensName || null,
      bio: insertUser.bio || null,
      profileImage: insertUser.profileImage || null,
      coverImage: insertUser.coverImage || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUsername(userId: string, newUsername: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    // Check if username is available
    const isAvailable = await this.isUsernameAvailable(newUsername, userId);
    if (!isAvailable) {
      throw new Error("Username is already taken");
    }

    // Update the username
    const updatedUser = { ...user, uniqueId: newUsername };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.getUserByUniqueId(username);
    if (!existingUser) return true;
    
    // If we're excluding a user (for updates), check if it's the same user
    if (excludeUserId && existingUser.id === excludeUserId) return true;
    
    return false;
  }

  async getUserProfile(id: string, currentUserId?: string): Promise<UserProfile | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const vaskCount = Array.from(this.vasks.values()).filter(v => v.authorId === id).length;
    const likeCount = Array.from(this.likes.values()).filter(l => l.userId === id).length;
    const commentCount = Array.from(this.comments.values()).filter(c => c.authorId === id).length;
    
    const followCounts = await this.getFollowCounts(id);
    const isFollowing = currentUserId ? await this.getFollow(currentUserId, id) !== undefined : false;

    return {
      ...user,
      vaskCount,
      likeCount,
      commentCount,
      followersCount: followCounts.followersCount,
      followingCount: followCounts.followingCount,
      isFollowing
    };
  }

  private async buildVaskWithAuthor(vask: Vask, currentUserId?: string): Promise<VaskWithAuthor> {
    const author = this.users.get(vask.authorId);
    
    // If author doesn't exist, create a fallback user object
    if (!author) {
      console.warn(`Author not found for vask ${vask.id}, authorId: ${vask.authorId}`);
      const fallbackAuthor: User = {
        id: vask.authorId,
        uniqueId: "unknown_user",
        walletAddress: "unknown",
        ensName: null,
        displayName: "Unknown User",
        bio: null,
        profileImage: null,
        coverImage: null,
        createdAt: new Date()
      };
      
      const likeCount = Array.from(this.likes.values()).filter(l => l.vaskId === vask.id).length;
      const commentCount = Array.from(this.comments.values()).filter(c => c.vaskId === vask.id).length;
      const isLiked = currentUserId ? Array.from(this.likes.values()).some(l => l.vaskId === vask.id && l.userId === currentUserId) : false;
      const isFollowing = currentUserId ? Array.from(this.follows.values()).some(f => f.followerId === currentUserId && f.followingId === vask.authorId) : false;

      return {
        ...vask,
        author: { ...fallbackAuthor, isFollowing },
        likeCount,
        commentCount,
        isLiked
      };
    }
    
    const likeCount = Array.from(this.likes.values()).filter(l => l.vaskId === vask.id).length;
    const commentCount = Array.from(this.comments.values()).filter(c => c.vaskId === vask.id).length;
    const isLiked = currentUserId ? Array.from(this.likes.values()).some(l => l.vaskId === vask.id && l.userId === currentUserId) : false;
    const isFollowing = currentUserId ? Array.from(this.follows.values()).some(f => f.followerId === currentUserId && f.followingId === vask.authorId) : false;

    return {
      ...vask,
      author: { ...author, isFollowing },
      likeCount,
      commentCount,
      isLiked
    };
  }

  async getVask(id: string, currentUserId?: string): Promise<VaskWithAuthor | undefined> {
    const vask = this.vasks.get(id);
    if (!vask) return undefined;
    return this.buildVaskWithAuthor(vask, currentUserId);
  }

  async getVasks(limit = 50, offset = 0, currentUserId?: string): Promise<VaskWithAuthor[]> {
    const allVasks = Array.from(this.vasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return Promise.all(allVasks.map(vask => this.buildVaskWithAuthor(vask, currentUserId)));
  }

  async getVasksByUser(userId: string, limit = 50, offset = 0, currentUserId?: string): Promise<VaskWithAuthor[]> {
    const userVasks = Array.from(this.vasks.values())
      .filter(v => v.authorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return Promise.all(userVasks.map(vask => this.buildVaskWithAuthor(vask, currentUserId)));
  }

  async createVask(insertVask: InsertVask): Promise<Vask> {
    const id = randomUUID();
    const vask: Vask = { 
      ...insertVask, 
      id, 
      createdAt: new Date(),
      isPinned: false,
      content: insertVask.content || null,
      imageUrl: insertVask.imageUrl || null,
      imageHash: insertVask.imageHash || null,
      ipfsHash: insertVask.ipfsHash || null
    };
    this.vasks.set(id, vask);
    return vask;
  }

  async deleteVask(id: string, userId: string): Promise<boolean> {
    const vask = this.vasks.get(id);
    if (!vask || vask.authorId !== userId) return false;
    
    this.vasks.delete(id);
    // Delete associated likes and comments
    Array.from(this.likes.entries()).forEach(([key, like]) => {
      if (like.vaskId === id) this.likes.delete(key);
    });
    Array.from(this.comments.entries()).forEach(([key, comment]) => {
      if (comment.vaskId === id) this.comments.delete(key);
    });
    
    return true;
  }

  async pinVask(id: string, userId: string): Promise<boolean> {
    const vask = this.vasks.get(id);
    if (!vask || vask.authorId !== userId) return false;
    
    // Unpin any existing pinned vask
    await this.unpinVask(userId);
    
    // Pin this vask
    vask.isPinned = true;
    this.vasks.set(id, vask);
    return true;
  }

  async unpinVask(userId: string): Promise<boolean> {
    const userVasks = Array.from(this.vasks.values()).filter(v => v.authorId === userId && v.isPinned);
    userVasks.forEach(vask => {
      vask.isPinned = false;
      this.vasks.set(vask.id, vask);
    });
    return true;
  }

  async getLike(vaskId: string, userId: string): Promise<Like | undefined> {
    return Array.from(this.likes.values()).find(
      like => like.vaskId === vaskId && like.userId === userId
    );
  }

  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = randomUUID();
    const like: Like = { 
      ...insertLike, 
      id, 
      createdAt: new Date()
    };
    this.likes.set(id, like);
    return like;
  }

  async deleteLike(vaskId: string, userId: string): Promise<boolean> {
    const like = Array.from(this.likes.entries()).find(
      ([_, like]) => like.vaskId === vaskId && like.userId === userId
    );
    if (!like) return false;
    
    this.likes.delete(like[0]);
    return true;
  }

  async getLikedVasks(userId: string, limit = 50, offset = 0): Promise<VaskWithAuthor[]> {
    const userLikes = Array.from(this.likes.values())
      .filter(l => l.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    const likedVasks = userLikes
      .map(like => this.vasks.get(like.vaskId))
      .filter(Boolean) as Vask[];

    return Promise.all(likedVasks.map(vask => this.buildVaskWithAuthor(vask, userId)));
  }

  async getComments(vaskId: string): Promise<CommentWithAuthor[]> {
    const vaskComments = Array.from(this.comments.values())
      .filter(c => c.vaskId === vaskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return vaskComments.map(comment => {
      const author = this.users.get(comment.authorId);
      
      // If author doesn't exist, create a fallback user object
      if (!author) {
        console.warn(`Author not found for comment ${comment.id}, authorId: ${comment.authorId}`);
        const fallbackAuthor: User = {
          id: comment.authorId,
          uniqueId: "unknown_user",
          walletAddress: "unknown",
          ensName: null,
          displayName: "Unknown User",
          bio: null,
          profileImage: null,
          coverImage: null,
          createdAt: new Date()
        };
        
        return {
          ...comment,
          author: fallbackAuthor
        };
      }
      
      return {
        ...comment,
        author
      };
    });
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = { 
      ...insertComment, 
      id, 
      createdAt: new Date()
    };
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment || comment.authorId !== userId) return false;
    
    this.comments.delete(id);
    return true;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(s => s.userId === userId);
  }

  async updateUserSettings(userId: string, settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    if (existing) {
      const updated = { ...existing, ...settings };
      this.userSettings.set(existing.id, updated);
      return updated;
    }
    
    const id = randomUUID();
    const newSettings: UserSettings = { 
      ...settings, 
      id, 
      userId,
      theme: settings.theme || null,
      preferences: settings.preferences || null
    };
    this.userSettings.set(id, newSettings);
    return newSettings;
  }

  async clearAllData(): Promise<void> {
    this.users.clear();
    this.vasks.clear();
    this.likes.clear();
    this.comments.clear();
    this.userSettings.clear();
    this.follows.clear();
  }

  // Follow methods
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const id = randomUUID();
    const follow: Follow = {
      id,
      followerId,
      followingId,
      createdAt: new Date()
    };
    this.follows.set(id, follow);
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const follow = Array.from(this.follows.entries()).find(
      ([_, follow]) => follow.followerId === followerId && follow.followingId === followingId
    );
    if (!follow) return false;
    
    this.follows.delete(follow[0]);
    return true;
  }

  async getFollow(followerId: string, followingId: string): Promise<Follow | undefined> {
    return Array.from(this.follows.values()).find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async getFollowers(userId: string, limit = 50, offset = 0): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(f => f.followingId === userId)
      .map(f => f.followerId)
      .slice(offset, offset + limit);

    return followerIds
      .map(id => this.users.get(id))
      .filter(Boolean) as User[];
  }

  async getFollowing(userId: string, limit = 50, offset = 0): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(f => f.followerId === userId)
      .map(f => f.followingId)
      .slice(offset, offset + limit);

    return followingIds
      .map(id => this.users.get(id))
      .filter(Boolean) as User[];
  }

  async getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    const followersCount = Array.from(this.follows.values()).filter(f => f.followingId === userId).length;
    const followingCount = Array.from(this.follows.values()).filter(f => f.followerId === userId).length;
    
    return { followersCount, followingCount };
  }

  // Search methods
  async searchUsers(query: string, limit = 20, offset = 0, currentUserId?: string): Promise<UserProfile[]> {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return [];

    const allUsers = Array.from(this.users.values());
    
    // Search by uniqueId, displayName, ensName, or walletAddress
    const matchingUsers = allUsers.filter(user => {
      const uniqueId = user.uniqueId?.toLowerCase() || '';
      const displayName = user.displayName?.toLowerCase() || '';
      const ensName = user.ensName?.toLowerCase() || '';
      const walletAddress = user.walletAddress?.toLowerCase() || '';
      
      return uniqueId.includes(searchTerm) ||
             displayName.includes(searchTerm) || 
             ensName.includes(searchTerm) || 
             walletAddress.includes(searchTerm);
    });

    // Get paginated results
    const paginatedUsers = matchingUsers.slice(offset, offset + limit);
    
    // Convert to UserProfile with follow status
    const userProfiles = await Promise.all(
      paginatedUsers.map(async (user) => {
        const profile = await this.getUserProfile(user.id, currentUserId);
        return profile!;
      })
    );

    return userProfiles;
  }

  async getUserSuggestions(userId: string, limit = 10): Promise<UserProfile[]> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) return [];

    // Get users that the current user is already following
    const following = await this.getFollowing(userId);
    const followingIds = new Set(following.map(user => user.id));
    followingIds.add(userId); // Exclude self

    // Get all users except current user and already followed users
    const allUsers = Array.from(this.users.values())
      .filter(user => !followingIds.has(user.id))
      .filter(user => user.id !== userId); // Double-check to exclude self

    if (allUsers.length === 0) return [];

    // Algorithm to suggest users based on:
    // 1. Mutual connections (users who follow people you follow)
    // 2. Popular users (users with many followers)
    // 3. Active users (users with many vasks)
    // 4. Recent users (newly joined users)

    const suggestions = allUsers.map(user => {
      let score = 0;

      // 1. Mutual connections score
      const userFollowing = Array.from(this.follows.values())
        .filter(f => f.followerId === user.id)
        .map(f => f.followingId);
      
      const currentUserFollowing = Array.from(this.follows.values())
        .filter(f => f.followerId === userId)
        .map(f => f.followingId);
      
      const mutualConnections = userFollowing.filter(id => currentUserFollowing.includes(id));
      score += mutualConnections.length * 3; // Weight mutual connections highly

      // 2. Popularity score (followers count)
      const followersCount = Array.from(this.follows.values()).filter(f => f.followingId === user.id).length;
      score += Math.min(followersCount, 20); // Cap at 20 to avoid super popular users dominating

      // 3. Activity score (vask count)
      const vaskCount = Array.from(this.vasks.values()).filter(v => v.authorId === user.id).length;
      score += Math.min(vaskCount, 15); // Cap at 15 to avoid spam users

      // 4. Recency bonus (newer users get slight boost)
      const daysSinceJoined = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceJoined < 7) {
        score += 5; // New user bonus
      } else if (daysSinceJoined < 30) {
        score += 2; // Recent user bonus
      }

      // 5. Similar interests (if users have similar bio keywords)
      if (user.bio && currentUser.bio) {
        const userBioWords = user.bio.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        const currentUserBioWords = currentUser.bio.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        const commonWords = userBioWords.filter(word => currentUserBioWords.includes(word));
        score += commonWords.length * 2;
      }

      return { user, score };
    });

    // Sort by score (highest first) and take top suggestions
    const sortedSuggestions = suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Convert to UserProfile format
    const userProfiles = await Promise.all(
      sortedSuggestions.map(async ({ user }) => {
        const profile = await this.getUserProfile(user.id, userId);
        return profile!;
      })
    );

    return userProfiles;
  }

  // Admin methods
  async getAllUsers(limit = 50, offset = 0): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getAdminUser(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(
      admin => admin.username === username
    );
  }

  async createAdminUser(insertAdminUser: InsertAdminUser): Promise<AdminUser> {
    const id = randomUUID();
    const adminUser: AdminUser = {
      ...insertAdminUser,
      id,
      createdAt: new Date(),
      lastLogin: null
    };
    this.adminUsers.set(id, adminUser);
    return adminUser;
  }

  async updateAdminLastLogin(username: string): Promise<void> {
    const adminUser = Array.from(this.adminUsers.values()).find(
      admin => admin.username === username
    );
    if (adminUser) {
      adminUser.lastLogin = new Date();
      this.adminUsers.set(adminUser.id, adminUser);
    }
  }

  async updateAdminPassword(username: string, newPasswordHash: string): Promise<void> {
    const adminUser = Array.from(this.adminUsers.values()).find(
      admin => admin.username === username
    );
    if (adminUser) {
      adminUser.passwordHash = newPasswordHash;
      this.adminUsers.set(adminUser.id, adminUser);
    }
  }

  async clearAdminUsers(): Promise<void> {
    this.adminUsers.clear();
  }

  // Poll methods
  async getPoll(id: string, currentUserId?: string): Promise<PollWithCreator | undefined> {
    const poll = this.polls.get(id);
    if (!poll) return undefined;

    const creator = await this.getUser(poll.creatorId);
    if (!creator) return undefined;

    const totalVotes = Object.values(poll.votes as { [option: number]: number } || {}).reduce((sum, count) => sum + count, 0);
    
    let userVote: { option: number;  timestamp: number } | undefined;
    if (currentUserId && poll.userVotes) {
      const userVotes = poll.userVotes as { [userAddress: string]: { option: number;  timestamp: number } };
      const user = await this.getUser(currentUserId);
      if (user) {
        userVote = userVotes[user.walletAddress];
      }
    }

    return {
      ...poll,
      creator,
      totalVotes,
      userVote,
    };
  }

  async getPolls(limit = 50, offset = 0, currentUserId?: string): Promise<PollWithCreator[]> {
    console.log('🔍 getPolls called with:', { limit, offset, currentUserId });
    const allPolls = Array.from(this.polls.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    console.log('🔍 Found polls:', allPolls.length);
    console.log('🔍 Poll IDs:', allPolls.map(p => p.id));
    
    try {
      const result = await Promise.all(allPolls.map(poll => this.buildPollWithCreator(poll, currentUserId)));
      console.log('🔍 Successfully built polls with creators:', result.length);
      return result;
    } catch (error) {
      console.error('🔍 Error in getPolls:', error);
      throw error;
    }
  }

  async getPollsByUser(userId: string, limit = 50, offset = 0, currentUserId?: string): Promise<PollWithCreator[]> {
    const userPolls = Array.from(this.polls.values())
      .filter(p => p.creatorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return Promise.all(userPolls.map(poll => this.buildPollWithCreator(poll, currentUserId)));
  }

  async createPoll(insertPoll: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const now = new Date();
    
    // Initialize votes for each option
    const votes: { [option: number]: number } = {};
    insertPoll.options.forEach((_, index) => {
      votes[index] = 0;
    });

    const poll: Poll = {
      ...insertPoll,
      id,
      createdAt: now,
      updatedAt: now,
      correctOption: null,
      isResolved: false,
      votes,
      userVotes: {},
      status: "active",
      description: insertPoll.description || null,
    };

    this.polls.set(id, poll);
    console.log(`🌍 Public Poll Created: "${poll.title}" by ${poll.creatorId} - Available to ALL users via API`);
    
    return poll;
  }

  async voteOnPoll(pollId: string, userId: string, option: number): Promise<boolean> {
    console.log(`🗳️ Vote attempt: pollId=${pollId}, userId=${userId}, option=${option}`);
    
    const poll = this.polls.get(pollId);
    if (!poll) {
      console.log(`❌ Vote failed: Poll not found for ID ${pollId}`);
      return false;
    }

    if (poll.isResolved) {
      console.log(`❌ Vote failed: Poll ${pollId} is already resolved`);
      return false;
    }
    
    if (poll.deadline < new Date()) {
      console.log(`❌ Vote failed: Poll ${pollId} deadline has passed (${poll.deadline})`);
      return false;
    }

    // Get user by ID to get their wallet address
    const user = await this.getUser(userId);
    if (!user) {
      console.log(`❌ Vote failed: User not found for ID ${userId}`);
      return false;
    }

    const userVotes = poll.userVotes as { [userAddress: string]: { option: number; timestamp: number } } || {};
    if (userVotes[user.walletAddress]) {
      console.log(`❌ Vote failed: User ${user.walletAddress} has already voted on poll ${pollId}`);
      return false;
    }

    if (option >= (poll.options as string[]).length) {
      console.log(`❌ Vote failed: Invalid option ${option} for poll ${pollId} with ${(poll.options as string[]).length} options`);
      return false;
    }

    // Record the vote
    userVotes[user.walletAddress] = {
      option,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Update vote counts
    const votes = poll.votes as { [option: number]: number } || {};
    votes[option] = (votes[option] || 0) + 1;

    poll.votes = votes;
    poll.userVotes = userVotes;
    poll.updatedAt = new Date();

    this.polls.set(pollId, poll);
    console.log(`🗳️ Public Vote Cast: ${user.walletAddress} voted for option ${option} on poll "${poll.title}" - Visible to ALL users`);
    
    return true;
  }

  async resolvePoll(pollId: string, correctOption: number, userId: string): Promise<boolean> {
    const poll = this.polls.get(pollId);
    if (!poll) return false;

    if (poll.isResolved) return false;
    if (poll.creatorId !== userId) return false; // Only creator can resolve

    poll.correctOption = correctOption;
    poll.isResolved = true;
    poll.status = "resolved";
    poll.updatedAt = new Date();

    this.polls.set(pollId, poll);
    console.log(`✅ Public Poll Resolved: "${poll.title}" - Correct option: ${correctOption} - Result visible to ALL users`);
    
    return true;
  }

  async hasUserVoted(pollId: string, userAddress: string): Promise<boolean> {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.userVotes) return false;

    const userVotes = poll.userVotes as { [userAddress: string]: { option: number; timestamp: number } };
    return !!userVotes[userAddress];
  }

  async getUserVote(pollId: string, userAddress: string): Promise<{ option: number; timestamp: number } | null> {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.userVotes) return null;

    const userVotes = poll.userVotes as { [userAddress: string]: { option: number; timestamp: number } };
    return userVotes[userAddress] || null;
  }

  private async buildPollWithCreator(poll: Poll, currentUserId?: string): Promise<PollWithCreator> {
    const creator = await this.getUser(poll.creatorId);
    if (!creator) {
      // If creator doesn't exist, create a fallback creator object
      console.warn(`Creator not found for poll ${poll.id}, using fallback creator`);
      const fallbackCreator = {
        id: poll.creatorId,
        uniqueId: 'unknown',
        walletAddress: 'unknown',
        ensName: null,
        displayName: 'Unknown User',
        bio: null,
        profileImage: null,
        coverImage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return {
        ...poll,
        creator: fallbackCreator,
        totalVotes: Object.values(poll.votes as { [option: number]: number } || {}).reduce((sum, count) => sum + count, 0),
        userVote: undefined // Will be set in the main flow below
      };
    }

    const totalVotes = Object.values(poll.votes as { [option: number]: number } || {}).reduce((sum, count) => sum + count, 0);
    
    let userVote: { option: number;  timestamp: number } | undefined;
    if (currentUserId && poll.userVotes) {
      const userVotes = poll.userVotes as { [userAddress: string]: { option: number;  timestamp: number } };
      const user = await this.getUser(currentUserId);
      if (user) {
        userVote = userVotes[user.walletAddress];
      }
    }

    return {
      ...poll,
      creator,
      totalVotes,
      userVote,
    };
  }

  // Admin methods
  async getAllVasks(limit: number = 50, offset: number = 0): Promise<any[]> {
    const vasks = Array.from(this.vasks.values()).slice(offset, offset + limit);
    return vasks.map(vask => {
      const author = this.users.get(vask.authorId);
      return {
        ...vask,
        authorName: author?.displayName || author?.uniqueId || 'Unknown'
      };
    });
  }

  async getAllPolls(limit: number = 50, offset: number = 0): Promise<any[]> {
    const polls = Array.from(this.polls.values()).slice(offset, offset + limit);
    return polls.map(poll => {
      const creator = this.users.get(poll.creatorId);
      const totalVotes = Array.from(this.pollVotes.values())
        .filter(vote => vote.pollId === poll.id).length;
      
      return {
        ...poll,
        creatorName: creator?.displayName || creator?.uniqueId || 'Unknown',
        totalVotes,
        status: poll.isResolved ? 'resolved' : 'active'
      };
    });
  }

  async getAnalytics(): Promise<any> {
    const users = Array.from(this.users.values());
    const vasks = Array.from(this.vasks.values());
    const polls = Array.from(this.polls.values());
    const likes = Array.from(this.likes.values());
    const comments = Array.from(this.comments.values());
    const votes = Array.from(this.pollVotes.values());

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newUsersToday = users.filter(user => 
      new Date(user.createdAt) >= today
    ).length;

    const newUsersThisWeek = users.filter(user => 
      new Date(user.createdAt) >= weekAgo
    ).length;

    return {
      totalUsers: users.length,
      totalVasks: vasks.length,
      totalPolls: polls.length,
      activeUsers: users.length, // Simplified - all users are considered active
      newUsersToday,
      newUsersThisWeek,
      totalLikes: likes.length,
      totalComments: comments.length,
      totalVotes: votes.length
    };
  }


  async deleteUser(id: string): Promise<boolean> {
    if (!this.users.has(id)) return false;
    
    // Delete related data
    this.vasks.forEach((vask, vaskId) => {
      if (vask.authorId === id) {
        this.vasks.delete(vaskId);
      }
    });
    
    this.polls.forEach((poll, pollId) => {
      if (poll.creatorId === id) {
        this.polls.delete(pollId);
      }
    });
    
    this.likes.forEach((like, likeId) => {
      if (like.userId === id) {
        this.likes.delete(likeId);
      }
    });
    
    this.comments.forEach((comment, commentId) => {
      if (comment.authorId === id) {
        this.comments.delete(commentId);
      }
    });
    
    this.pollVotes.forEach((vote, voteId) => {
      if (vote.userId === id) {
        this.pollVotes.delete(voteId);
      }
    });
    
    this.follows.forEach((follow, followId) => {
      if (follow.followerId === id || follow.followingId === id) {
        this.follows.delete(followId);
      }
    });
    
    this.users.delete(id);
    return true;
  }


  async deletePoll(id: string): Promise<boolean> {
    if (!this.polls.has(id)) return false;
    
    // Delete related data
    this.pollVotes.forEach((vote, voteId) => {
      if (vote.pollId === id) {
        this.pollVotes.delete(voteId);
      }
    });
    
    this.polls.delete(id);
    return true;
  }
}

export const storage = new MemStorage();
