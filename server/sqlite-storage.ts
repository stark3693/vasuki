import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, desc, and, sql } from 'drizzle-orm';
import { 
  users, 
  vasks, 
  likes, 
  comments, 
  userSettings, 
  polls, 
  pollVotes, 
  follows, 
  adminUsers,
  type User,
  type Vask,
  type Comment,
  type Poll,
  type InsertUser,
  type InsertVask,
  type InsertComment,
  type InsertPoll,
  type InsertPollVote,
  type InsertAdminUser,
  type VaskWithAuthor,
  type CommentWithAuthor,
  type PollWithCreator,
  type UserProfile
} from '@shared/sqlite-schema';

// Initialize SQLite database
const sqlite = new Database('./database.sqlite');
const db = drizzle(sqlite);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

export class SQLiteStorage {
  // User methods
  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async getUser(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);
    return result[0] || null;
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.uniqueId, uniqueId)).limit(1);
    return result[0] || null;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0] || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.changes > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Vask methods
  async createVask(vaskData: InsertVask): Promise<Vask> {
    const result = await db.insert(vasks).values(vaskData).returning();
    return result[0];
  }

  async getVask(id: string): Promise<Vask | null> {
    const result = await db.select().from(vasks).where(eq(vasks.id, id)).limit(1);
    return result[0] || null;
  }

  async getVasks(limit: number = 50, offset: number = 0): Promise<VaskWithAuthor[]> {
    const result = await db
      .select({
        id: vasks.id,
        authorId: vasks.authorId,
        content: vasks.content,
        contentEncrypted: vasks.contentEncrypted,
        imageUrl: vasks.imageUrl,
        imageHash: vasks.imageHash,
        ipfsHash: vasks.ipfsHash,
        createdAt: vasks.createdAt,
        isPinned: vasks.isPinned,
        isEncrypted: vasks.isEncrypted,
        author: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(vasks)
      .leftJoin(users, eq(vasks.authorId, users.id))
      .orderBy(desc(vasks.createdAt))
      .limit(limit)
      .offset(offset);

    // Add like and comment counts
    const vasksWithCounts = await Promise.all(
      result.map(async (vask) => {
        const likeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(likes)
          .where(eq(likes.vaskId, vask.id));

        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.vaskId, vask.id));

        return {
          ...vask,
          likeCount: likeCount[0]?.count || 0,
          commentCount: commentCount[0]?.count || 0,
          isLiked: false, // Will be set by client
          author: {
            ...vask.author,
            isFollowing: false, // Will be set by client
          }
        };
      })
    );

    return vasksWithCounts;
  }

  async getUserVasks(userId: string, limit: number = 50, offset: number = 0): Promise<VaskWithAuthor[]> {
    const result = await db
      .select({
        id: vasks.id,
        authorId: vasks.authorId,
        content: vasks.content,
        contentEncrypted: vasks.contentEncrypted,
        imageUrl: vasks.imageUrl,
        imageHash: vasks.imageHash,
        ipfsHash: vasks.ipfsHash,
        createdAt: vasks.createdAt,
        isPinned: vasks.isPinned,
        isEncrypted: vasks.isEncrypted,
        author: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(vasks)
      .leftJoin(users, eq(vasks.authorId, users.id))
      .where(eq(vasks.authorId, userId))
      .orderBy(desc(vasks.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(vask => ({
      ...vask,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      author: {
        ...vask.author,
        isFollowing: false,
      }
    }));
  }

  async deleteVask(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(vasks).where(and(eq(vasks.id, id), eq(vasks.authorId, userId)));
    return result.changes > 0;
  }

  // Like methods
  async createLike(vaskId: string, userId: string): Promise<void> {
    await db.insert(likes).values({ vaskId, userId });
  }

  async deleteLike(vaskId: string, userId: string): Promise<void> {
    await db.delete(likes).where(and(eq(likes.vaskId, vaskId), eq(likes.userId, userId)));
  }

  async getLikedVasks(userId: string): Promise<VaskWithAuthor[]> {
    const result = await db
      .select({
        id: vasks.id,
        authorId: vasks.authorId,
        content: vasks.content,
        contentEncrypted: vasks.contentEncrypted,
        imageUrl: vasks.imageUrl,
        imageHash: vasks.imageHash,
        ipfsHash: vasks.ipfsHash,
        createdAt: vasks.createdAt,
        isPinned: vasks.isPinned,
        isEncrypted: vasks.isEncrypted,
        author: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(likes)
      .leftJoin(vasks, eq(likes.vaskId, vasks.id))
      .leftJoin(users, eq(vasks.authorId, users.id))
      .where(eq(likes.userId, userId))
      .orderBy(desc(vasks.createdAt));

    return result.map(vask => ({
      ...vask,
      likeCount: 0,
      commentCount: 0,
      isLiked: true,
      author: {
        ...vask.author,
        isFollowing: false,
      }
    }));
  }

  // Comment methods
  async createComment(commentData: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(commentData).returning();
    return result[0];
  }

  async getComments(vaskId: string): Promise<CommentWithAuthor[]> {
    const result = await db
      .select({
        id: comments.id,
        vaskId: comments.vaskId,
        authorId: comments.authorId,
        content: comments.content,
        contentEncrypted: comments.contentEncrypted,
        createdAt: comments.createdAt,
        isEncrypted: comments.isEncrypted,
        author: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.vaskId, vaskId))
      .orderBy(desc(comments.createdAt));

    return result;
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(comments).where(and(eq(comments.id, id), eq(comments.authorId, userId)));
    return result.changes > 0;
  }

  // User settings methods
  async createUserSettings(userId: string, settings: any): Promise<void> {
    await db.insert(userSettings).values({ userId, ...settings });
  }

  async getUserSettings(userId: string): Promise<any> {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    return result[0] || null;
  }

  async updateUserSettings(userId: string, settings: any): Promise<void> {
    await db.update(userSettings).set(settings).where(eq(userSettings.userId, userId));
  }

  // Poll methods
  async createPoll(pollData: InsertPoll): Promise<Poll> {
    const result = await db.insert(polls).values(pollData).returning();
    return result[0];
  }

  async getPoll(id: string): Promise<PollWithCreator | null> {
    const result = await db
      .select({
        id: polls.id,
        creatorId: polls.creatorId,
        title: polls.title,
        titleEncrypted: polls.titleEncrypted,
        description: polls.description,
        descriptionEncrypted: polls.descriptionEncrypted,
        options: polls.options,
        optionsEncrypted: polls.optionsEncrypted,
        deadline: polls.deadline,
        correctOption: polls.correctOption,
        isResolved: polls.isResolved,
        isStakingEnabled: polls.isStakingEnabled,
        totalStaked: polls.totalStaked,
        votes: polls.votes,
        stakes: polls.stakes,
        userVotes: polls.userVotes,
        status: polls.status,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
        isEncrypted: polls.isEncrypted,
        creator: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(polls)
      .leftJoin(users, eq(polls.creatorId, users.id))
      .where(eq(polls.id, id))
      .limit(1);

    if (!result[0]) return null;

    const poll = result[0];
    const totalVotes = Object.values(poll.votes || {}).reduce((sum: number, count: any) => sum + (count || 0), 0);

    return {
      ...poll,
      totalVotes,
      userVote: undefined // Will be set by client
    };
  }

  async getAllPolls(): Promise<PollWithCreator[]> {
    const result = await db
      .select({
        id: polls.id,
        creatorId: polls.creatorId,
        title: polls.title,
        titleEncrypted: polls.titleEncrypted,
        description: polls.description,
        descriptionEncrypted: polls.descriptionEncrypted,
        options: polls.options,
        optionsEncrypted: polls.optionsEncrypted,
        deadline: polls.deadline,
        correctOption: polls.correctOption,
        isResolved: polls.isResolved,
        isStakingEnabled: polls.isStakingEnabled,
        totalStaked: polls.totalStaked,
        votes: polls.votes,
        stakes: polls.stakes,
        userVotes: polls.userVotes,
        status: polls.status,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
        isEncrypted: polls.isEncrypted,
        creator: {
          id: users.id,
          uniqueId: users.uniqueId,
          walletAddress: users.walletAddress,
          ensName: users.ensName,
          displayName: users.displayName,
          displayNameEncrypted: users.displayNameEncrypted,
          bio: users.bio,
          bioEncrypted: users.bioEncrypted,
          profileImage: users.profileImage,
          coverImage: users.coverImage,
          createdAt: users.createdAt,
          isEncrypted: users.isEncrypted,
        }
      })
      .from(polls)
      .leftJoin(users, eq(polls.creatorId, users.id))
      .orderBy(desc(polls.createdAt));

    return result.map(poll => {
      const totalVotes = Object.values(poll.votes || {}).reduce((sum: number, count: any) => sum + (count || 0), 0);
      return {
        ...poll,
        totalVotes,
        userVote: undefined
      };
    });
  }

  async updatePoll(id: string, pollData: Partial<Poll>): Promise<Poll | null> {
    const result = await db.update(polls).set(pollData).where(eq(polls.id, id)).returning();
    return result[0] || null;
  }

  async deletePoll(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(polls).where(and(eq(polls.id, id), eq(polls.creatorId, userId)));
    return result.changes > 0;
  }

  // Poll vote methods
  async createPollVote(voteData: InsertPollVote): Promise<void> {
    await db.insert(pollVotes).values(voteData);
  }

  async getPollVotes(pollId: string): Promise<any[]> {
    return await db.select().from(pollVotes).where(eq(pollVotes.pollId, pollId));
  }

  // Follow methods
  async createFollow(followerId: string, followingId: string): Promise<void> {
    await db.insert(follows).values({ followerId, followingId });
  }

  async deleteFollow(followerId: string, followingId: string): Promise<void> {
    await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        uniqueId: users.uniqueId,
        walletAddress: users.walletAddress,
        ensName: users.ensName,
        displayName: users.displayName,
        displayNameEncrypted: users.displayNameEncrypted,
        bio: users.bio,
        bioEncrypted: users.bioEncrypted,
        profileImage: users.profileImage,
        coverImage: users.coverImage,
        createdAt: users.createdAt,
        isEncrypted: users.isEncrypted,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return result;
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        uniqueId: users.uniqueId,
        walletAddress: users.walletAddress,
        ensName: users.ensName,
        displayName: users.displayName,
        displayNameEncrypted: users.displayNameEncrypted,
        bio: users.bio,
        bioEncrypted: users.bioEncrypted,
        profileImage: users.profileImage,
        coverImage: users.coverImage,
        createdAt: users.createdAt,
        isEncrypted: users.isEncrypted,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return result;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    return result.length > 0;
  }

  // Admin methods
  async createAdminUser(adminData: InsertAdminUser): Promise<any> {
    const result = await db.insert(adminUsers).values(adminData).returning();
    return result[0];
  }

  async getAdminUser(username: string): Promise<any> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    return result[0] || null;
  }

  async updateAdminLastLogin(username: string): Promise<void> {
    await db.update(adminUsers).set({ lastLogin: new Date() }).where(eq(adminUsers.username, username));
  }

  async clearAdminUsers(): Promise<void> {
    await db.delete(adminUsers);
  }

  // Close database connection
  close(): void {
    sqlite.close();
  }
}

export const storage = new SQLiteStorage();
