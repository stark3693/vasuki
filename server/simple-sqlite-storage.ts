import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { EndToEndEncryption, EncryptionKeys } from './lib/encryption';

// Initialize SQLite database
const sqlite = new Database('./database.sqlite');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

export interface User {
  id: string;
  uniqueId: string;
  walletAddress: string;
  ensName?: string | null;
  displayName?: string | null;
  displayNameEncrypted?: string | null;
  bio?: string | null;
  bioEncrypted?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  createdAt: Date;
  isEncrypted: boolean;
}

export interface Vask {
  id: string;
  authorId: string;
  content?: string | null;
  contentEncrypted?: string | null;
  imageUrl?: string | null;
  imageHash?: string | null;
  ipfsHash?: string | null;
  createdAt: Date;
  isPinned: boolean;
  isEncrypted: boolean;
  mediaUrls?: string[];
  mediaTypes?: string[];
  mediaFilenames?: string[];
  mediaSizes?: number[];
}

export interface Comment {
  id: string;
  vaskId: string;
  authorId: string;
  content: string;
  contentEncrypted?: string | null;
  createdAt: Date;
  isEncrypted: boolean;
}


export interface Poll {
  id: string;
  creatorId: string;
  title: string;
  titleEncrypted?: string | null;
  description?: string | null;
  descriptionEncrypted?: string | null;
  options: string[]; // Array of option strings
  optionsEncrypted?: string | null;
  deadline: Date;
  correctOption?: number | null;
  isResolved: boolean;
  isStakingEnabled: boolean;
  totalStaked: string;
  votes: number[]; // Array of vote counts
  stakes: number[]; // Array of stake amounts
  userVotes: string; // JSON string
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isEncrypted: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  description?: string | null;
  creatorId: string;
  participants: string; // JSON string of participant IDs
  maxParticipants: number;
  firstMessage?: string | null;
  passwordHash?: string | null;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface ChatInvitation {
  id: string;
  roomId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitationToken: string;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
}

export interface ChatRoomAccess {
  id: string;
  roomId: string;
  userId: string;
  accessType: 'creator' | 'invited' | 'password_joined';
  grantedBy?: string;
  grantedAt: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  content?: string;
  senderId: string;
  senderName: string;
  messageType: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  mediaFilename?: string;
  mediaSize?: number;
  timestamp: Date;
}



export interface VaskWithAuthor extends Vask {
  author: User & {
    isFollowing?: boolean;
  };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface CommentWithAuthor extends Comment {
  author: User;
}

export interface PollWithCreator extends Poll {
  creator: User;
  totalVotes: number;
  userVote?: {
    option: number;
    stakeAmount: string;
    timestamp: number;
  };
}

export class SimpleSQLiteStorage {
  // User methods
  async createUser(userData: any): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO users (id, unique_id, wallet_address, ens_name, display_name, display_name_encrypted, bio, bio_encrypted, profile_image, cover_image, created_at, is_encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      userData.uniqueId,
      userData.walletAddress,
      userData.ensName || null,
      userData.displayName || null,
      userData.displayNameEncrypted || null,
      userData.bio || null,
      userData.bioEncrypted || null,
      userData.profileImage || null,
      userData.coverImage || null,
      now.getTime(),
      userData.isEncrypted ? 1 : 0
    );
    
    const user = await this.getUser(id);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    console.log(`🔍 getUser called with id: ${id}`);
    const stmt = sqlite.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    console.log(`🔍 getUser result: ${row ? 'found' : 'not found'}`);
    
    if (!row) return null;
    
    return {
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted)
    };
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | null> {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE unique_id = ?');
    const row = stmt.get(uniqueId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted)
    };
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE wallet_address = ?');
    const row = stmt.get(walletAddress) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted)
    };
  }

  async updateUser(id: string, updates: any): Promise<User | null> {
    const fields = [];
    const values = [];
    
    if (updates.uniqueId !== undefined) {
      fields.push('unique_id = ?');
      values.push(updates.uniqueId);
    }
    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.displayNameEncrypted !== undefined) {
      fields.push('display_name_encrypted = ?');
      values.push(updates.displayNameEncrypted);
    }
    if (updates.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updates.bio);
    }
    if (updates.bioEncrypted !== undefined) {
      fields.push('bio_encrypted = ?');
      values.push(updates.bioEncrypted);
    }
    if (updates.profileImage !== undefined) {
      fields.push('profile_image = ?');
      values.push(updates.profileImage);
    }
    if (updates.coverImage !== undefined) {
      fields.push('cover_image = ?');
      values.push(updates.coverImage);
    }
    if (updates.ensName !== undefined) {
      fields.push('ens_name = ?');
      values.push(updates.ensName);
    }
    
    if (fields.length === 0) return this.getUser(id);
    
    values.push(id);
    const stmt = sqlite.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    return this.getUser(id);
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const stmt = sqlite.prepare('SELECT id FROM users WHERE unique_id = ? AND id != ?');
    const result = stmt.get(username, excludeUserId || '');
    return !result;
  }

  async updateUsername(userId: string, newUsername: string): Promise<User | null> {
    // Check if username is available
    if (!(await this.isUsernameAvailable(newUsername, userId))) {
      throw new Error('Username is already taken');
    }
    
    return this.updateUser(userId, { uniqueId: newUsername });
  }

  async getUserProfile(userId: string, currentUserId?: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    // Get user statistics
    const vaskCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM vasks WHERE author_id = ?');
    const likeCountStmt = sqlite.prepare(`
      SELECT COUNT(*) as count FROM likes l 
      LEFT JOIN vasks v ON l.vask_id = v.id 
      WHERE v.author_id = ?
    `);
    const commentCountStmt = sqlite.prepare(`
      SELECT COUNT(*) as count FROM comments c 
      LEFT JOIN vasks v ON c.vask_id = v.id 
      WHERE v.author_id = ?
    `);
    const followersCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?');
    const followingCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');

    const vaskCount = (vaskCountStmt.get(userId) as any)?.count || 0;
    const likeCount = (likeCountStmt.get(userId) as any)?.count || 0;
    const commentCount = (commentCountStmt.get(userId) as any)?.count || 0;
    const followersCount = (followersCountStmt.get(userId) as any)?.count || 0;
    const followingCount = (followingCountStmt.get(userId) as any)?.count || 0;

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const followStmt = sqlite.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND following_id = ?');
      isFollowing = ((followStmt.get(currentUserId, userId) as any)?.count || 0) > 0;
    }

    return {
      ...user,
      vaskCount,
      likeCount,
      commentCount,
      followersCount,
      followingCount,
      isFollowing
    };
  }

  // Vask methods
  async createVask(vaskData: any): Promise<Vask> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO vasks (id, author_id, content, content_encrypted, image_url, image_hash, ipfs_hash, created_at, is_pinned, is_encrypted, media_urls, media_types, media_filenames, media_sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      vaskData.authorId,
      vaskData.content || null,
      vaskData.contentEncrypted ? JSON.stringify(vaskData.contentEncrypted) : null,
      vaskData.imageUrl || null,
      vaskData.imageHash || null,
      vaskData.ipfsHash || null,
      now.getTime(),
      vaskData.isPinned ? 1 : 0,
      vaskData.isEncrypted ? 1 : 0,
      JSON.stringify(vaskData.mediaUrls || []),
      JSON.stringify(vaskData.mediaTypes || []),
      JSON.stringify(vaskData.mediaFilenames || []),
      JSON.stringify(vaskData.mediaSizes || [])
    );
    
    // Process hashtags and mentions if content exists
    if (vaskData.content) {
      await this.processHashtags(id, vaskData.content);
      await this.processMentions(id, vaskData.authorId, vaskData.content);
    }
    
    const vask = await this.getVask(id);
    if (!vask) throw new Error('Failed to create vask');
    return vask;
  }

  async getVask(id: string): Promise<Vask | null> {
    const stmt = sqlite.prepare('SELECT * FROM vasks WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      imageUrl: row.image_url,
      imageHash: row.image_hash,
      ipfsHash: row.ipfs_hash,
      createdAt: new Date(row.created_at),
      isPinned: Boolean(row.is_pinned),
      isEncrypted: Boolean(row.is_encrypted),
      mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
      mediaTypes: row.media_types ? JSON.parse(row.media_types) : [],
      mediaFilenames: row.media_filenames ? JSON.parse(row.media_filenames) : [],
      mediaSizes: row.media_sizes ? JSON.parse(row.media_sizes) : []
    };
  }

  async getVasks(limit: number = 50, offset: number = 0, currentUserId?: string): Promise<VaskWithAuthor[]> {
    console.log('🔍 getVasks called with currentUserId:', currentUserId);
    
    const stmt = sqlite.prepare(`
      SELECT v.id as vask_id, v.author_id, v.content, v.content_encrypted, v.image_url, v.image_hash, v.ipfs_hash, 
             v.created_at as vask_created_at, v.is_pinned, v.is_encrypted,
             v.media_urls, v.media_types, v.media_filenames, v.media_sizes,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, u.display_name_encrypted, 
             u.bio, u.bio_encrypted, u.profile_image, u.cover_image, u.created_at as user_created_at,
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.vask_id = v.id) as comment_count,
             ${currentUserId ? `(SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id AND l.user_id = ?) as is_liked,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = v.author_id) as is_following` : '0 as is_liked, 0 as is_following'}
      FROM vasks v
      LEFT JOIN users u ON v.author_id = u.id
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const params = currentUserId ? [currentUserId, currentUserId, limit, offset] : [limit, offset];
    const rows = stmt.all(...params) as any[];
    
    console.log('🔍 getVasks result sample:', rows.slice(0, 2).map(row => ({
      vask_id: row.vask_id,
      author_id: row.author_id,
      is_following: row.is_following,
      currentUserId
    })));
    
    return rows.map(row => {
      const reactions = this.getReactionsSync(row.vask_id);
      const userReaction = currentUserId ? this.getReactionSync(row.vask_id, currentUserId) : null;
      
      return {
        id: row.vask_id,
        authorId: row.author_id,
        content: row.content,
        contentEncrypted: row.content_encrypted,
        imageUrl: row.image_url,
        imageHash: row.image_hash,
        ipfsHash: row.ipfs_hash,
        createdAt: new Date(row.vask_created_at),
        isPinned: Boolean(row.is_pinned),
        isEncrypted: Boolean(row.is_encrypted),
        mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
        mediaTypes: row.media_types ? JSON.parse(row.media_types) : [],
        mediaFilenames: row.media_filenames ? JSON.parse(row.media_filenames) : [],
        mediaSizes: row.media_sizes ? JSON.parse(row.media_sizes) : [],
        author: {
          id: row.user_id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.user_created_at),
          isEncrypted: Boolean(row.is_encrypted),
          isFollowing: Boolean(row.is_following)
        },
        likeCount: row.like_count || 0,
        commentCount: row.comment_count || 0,
        isLiked: Boolean(row.is_liked),
        reactions: reactions,
        userReaction: userReaction?.emoji || null
      };
    });
  }

  async getVasksByUser(userId: string, limit: number = 50, offset: number = 0, currentUserId?: string): Promise<VaskWithAuthor[]> {
    const stmt = sqlite.prepare(`
      SELECT v.id as vask_id, v.author_id, v.content, v.content_encrypted, v.image_url, v.image_hash, v.ipfs_hash, 
             v.created_at as vask_created_at, v.is_pinned, v.is_encrypted,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, u.display_name_encrypted, 
             u.bio, u.bio_encrypted, u.profile_image, u.cover_image, u.created_at as user_created_at,
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.vask_id = v.id) as comment_count,
             ${currentUserId ? `(SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id AND l.user_id = ?) as is_liked,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = v.author_id) as is_following` : '0 as is_liked, 0 as is_following'}
      FROM vasks v
      LEFT JOIN users u ON v.author_id = u.id
      WHERE v.author_id = ?
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const params = currentUserId ? [currentUserId, currentUserId, userId, limit, offset] : [userId, limit, offset];
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.vask_id,
      authorId: row.author_id,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      imageUrl: row.image_url,
      imageHash: row.image_hash,
      ipfsHash: row.ipfs_hash,
      createdAt: new Date(row.vask_created_at),
      isPinned: Boolean(row.is_pinned),
      isEncrypted: Boolean(row.is_encrypted),
      author: {
        id: row.user_id,
        uniqueId: row.unique_id,
        walletAddress: row.wallet_address,
        ensName: row.ens_name,
        displayName: row.display_name,
        displayNameEncrypted: row.display_name_encrypted,
        bio: row.bio,
        bioEncrypted: row.bio_encrypted,
        profileImage: row.profile_image,
        coverImage: row.cover_image,
        createdAt: new Date(row.user_created_at),
        isEncrypted: Boolean(row.is_encrypted),
        isFollowing: Boolean(row.is_following)
      },
      likeCount: row.like_count || 0,
      commentCount: row.comment_count || 0,
      isLiked: Boolean(row.is_liked)
    }));
  }


  async pinVask(id: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('UPDATE vasks SET is_pinned = 1 WHERE id = ? AND author_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // Like methods
  async createLike(vaskId: string, userId: string): Promise<any> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO likes (id, vask_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, vaskId, userId, now.getTime());
    
    return {
      id,
      vaskId,
      userId,
      createdAt: now
    };
  }

  async deleteLike(vaskId: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('DELETE FROM likes WHERE vask_id = ? AND user_id = ?');
    const result = stmt.run(vaskId, userId);
    return result.changes > 0;
  }

  async getLike(vaskId: string, userId: string): Promise<any> {
    const stmt = sqlite.prepare('SELECT * FROM likes WHERE vask_id = ? AND user_id = ?');
    const row = stmt.get(vaskId, userId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      vaskId: row.vask_id,
      userId: row.user_id,
      createdAt: new Date(row.created_at)
    };
  }

  async getLikedVasks(userId: string, limit: number = 50, offset: number = 0): Promise<VaskWithAuthor[]> {
    const stmt = sqlite.prepare(`
      SELECT v.*, u.*, 
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.vask_id = v.id) as comment_count
      FROM likes l
      LEFT JOIN vasks v ON l.vask_id = v.id
      LEFT JOIN users u ON v.author_id = u.id
      WHERE l.user_id = ?
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset) as any[];
    
    return rows.map(row => ({
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      imageUrl: row.image_url,
      imageHash: row.image_hash,
      ipfsHash: row.ipfs_hash,
      createdAt: new Date(row.created_at),
      isPinned: Boolean(row.is_pinned),
      isEncrypted: Boolean(row.is_encrypted),
      author: {
        id: row.author_id,
        uniqueId: row.unique_id,
        walletAddress: row.wallet_address,
        ensName: row.ens_name,
        displayName: row.display_name,
        displayNameEncrypted: row.display_name_encrypted,
        bio: row.bio,
        bioEncrypted: row.bio_encrypted,
        profileImage: row.profile_image,
        coverImage: row.cover_image,
        createdAt: new Date(row.created_at),
        isEncrypted: Boolean(row.is_encrypted),
        isFollowing: false
      },
      likeCount: row.like_count || 0,
      commentCount: row.comment_count || 0,
      isLiked: true
    }));
  }

  // Reaction methods
  async createReaction(vaskId: string, userId: string, emoji: string, isPremium: boolean = false): Promise<any> {
    const id = randomUUID();
    const now = new Date();
    
    // Delete any existing reaction from this user on this vask (one reaction per user per vask)
    const deleteStmt = sqlite.prepare('DELETE FROM reactions WHERE vask_id = ? AND user_id = ?');
    deleteStmt.run(vaskId, userId);
    
    // Insert new reaction
    const stmt = sqlite.prepare(`
      INSERT INTO reactions (id, vask_id, user_id, emoji, is_premium, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, vaskId, userId, emoji, isPremium ? 1 : 0, now.getTime());
    
    return {
      id,
      vaskId,
      userId,
      emoji,
      isPremium,
      createdAt: now
    };
  }

  async deleteReaction(vaskId: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('DELETE FROM reactions WHERE vask_id = ? AND user_id = ?');
    const result = stmt.run(vaskId, userId);
    return result.changes > 0;
  }

  async getReaction(vaskId: string, userId: string): Promise<any> {
    const stmt = sqlite.prepare('SELECT * FROM reactions WHERE vask_id = ? AND user_id = ?');
    const row = stmt.get(vaskId, userId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      vaskId: row.vask_id,
      userId: row.user_id,
      emoji: row.emoji,
      isPremium: Boolean(row.is_premium),
      createdAt: new Date(row.created_at)
    };
  }

  getReactionsSync(vaskId: string): { [emoji: string]: number } {
    const stmt = sqlite.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM reactions
      WHERE vask_id = ?
      GROUP BY emoji
    `);
    
    const rows = stmt.all(vaskId) as any[];
    
    const reactions: { [emoji: string]: number } = {};
    rows.forEach(row => {
      reactions[row.emoji] = row.count;
    });
    
    return reactions;
  }

  async getReactions(vaskId: string): Promise<{ [emoji: string]: number }> {
    return this.getReactionsSync(vaskId);
  }

  getReactionSync(vaskId: string, userId: string): { emoji: string; isPremium: boolean } | null {
    const stmt = sqlite.prepare(`
      SELECT emoji, is_premium
      FROM reactions
      WHERE vask_id = ? AND user_id = ?
    `);
    
    const row = stmt.get(vaskId, userId) as any;
    
    if (!row) return null;
    
    return {
      emoji: row.emoji,
      isPremium: Boolean(row.is_premium)
    };
  }

  // Hashtag methods
  private parseHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex) || [];
    return matches.map(tag => tag.toLowerCase());
  }

  async processHashtags(vaskId: string, content: string): Promise<void> {
    const hashtags = this.parseHashtags(content);
    const now = Date.now();

    for (const tag of hashtags) {
      // Check if hashtag exists
      let hashtagStmt = sqlite.prepare('SELECT id FROM hashtags WHERE tag = ?');
      let hashtag = hashtagStmt.get(tag) as any;

      let hashtagId: string;
      if (hashtag) {
        // Update existing hashtag
        hashtagId = hashtag.id;
        const updateStmt = sqlite.prepare(`
          UPDATE hashtags 
          SET count = count + 1, last_used = ?
          WHERE id = ?
        `);
        updateStmt.run(now, hashtagId);
      } else {
        // Create new hashtag
        hashtagId = randomUUID();
        const insertStmt = sqlite.prepare(`
          INSERT INTO hashtags (id, tag, count, last_used, created_at)
          VALUES (?, ?, 1, ?, ?)
        `);
        insertStmt.run(hashtagId, tag, now, now);
      }

      // Link hashtag to vask
      const linkStmt = sqlite.prepare(`
        INSERT OR IGNORE INTO vask_hashtags (vask_id, hashtag_id, created_at)
        VALUES (?, ?, ?)
      `);
      linkStmt.run(vaskId, hashtagId, now);
    }
  }

  async getTrendingHashtags(limit: number = 10): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT id, tag, count, last_used
      FROM hashtags
      ORDER BY count DESC, last_used DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      tag: row.tag,
      count: row.count,
      lastUsed: new Date(row.last_used)
    }));
  }

  async getVasksByHashtag(tag: string, limit: number = 50, offset: number = 0, currentUserId?: string): Promise<any[]> {
    const normalizedTag = tag.toLowerCase().replace(/^#/, '');
    
    const stmt = sqlite.prepare(`
      SELECT v.id as vask_id, v.author_id, v.content, v.content_encrypted, v.image_url, 
             v.image_hash, v.ipfs_hash, v.created_at as vask_created_at, v.is_pinned, v.is_encrypted,
             v.media_urls, v.media_types, v.media_filenames, v.media_sizes,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, 
             u.display_name_encrypted, u.bio, u.bio_encrypted, u.profile_image, u.cover_image, 
             u.created_at as user_created_at,
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.vask_id = v.id) as comment_count,
             ${currentUserId ? `(SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id AND l.user_id = ?) as is_liked,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = v.author_id) as is_following` : '0 as is_liked, 0 as is_following'}
      FROM vasks v
      LEFT JOIN users u ON v.author_id = u.id
      INNER JOIN vask_hashtags vh ON v.id = vh.vask_id
      INNER JOIN hashtags h ON vh.hashtag_id = h.id
      WHERE h.tag = ?
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const params = currentUserId ? [currentUserId, currentUserId, normalizedTag, limit, offset] : [normalizedTag, limit, offset];
    const rows = stmt.all(...params) as any[];

    return rows.map(row => {
      const reactions = this.getReactionsSync(row.vask_id);
      const userReaction = currentUserId ? this.getReactionSync(row.vask_id, currentUserId) : null;

      return {
        id: row.vask_id,
        authorId: row.author_id,
        content: row.content,
        contentEncrypted: row.content_encrypted,
        imageUrl: row.image_url,
        imageHash: row.image_hash,
        ipfsHash: row.ipfs_hash,
        createdAt: new Date(row.vask_created_at),
        isPinned: Boolean(row.is_pinned),
        isEncrypted: Boolean(row.is_encrypted),
        mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
        mediaTypes: row.media_types ? JSON.parse(row.media_types) : [],
        mediaFilenames: row.media_filenames ? JSON.parse(row.media_filenames) : [],
        mediaSizes: row.media_sizes ? JSON.parse(row.media_sizes) : [],
        author: {
          id: row.user_id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.user_created_at),
          isEncrypted: Boolean(row.is_encrypted),
          isFollowing: Boolean(row.is_following)
        },
        likeCount: row.like_count || 0,
        commentCount: row.comment_count || 0,
        isLiked: Boolean(row.is_liked),
        reactions: reactions,
        userReaction: userReaction?.emoji || null
      };
    });
  }

  // Mention methods
  private parseMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map(mention => mention.slice(1)); // Remove @ symbol
  }

  async processMentions(vaskId: string, mentionerId: string, content: string): Promise<void> {
    const mentions = this.parseMentions(content);
    const now = Date.now();

    for (const uniqueId of mentions) {
      // Find user by uniqueId
      const userStmt = sqlite.prepare('SELECT id FROM users WHERE unique_id = ? COLLATE NOCASE');
      const user = userStmt.get(uniqueId) as any;

      if (user && user.id !== mentionerId) {
        // Create mention notification
        const mentionId = randomUUID();
        const insertStmt = sqlite.prepare(`
          INSERT INTO mentions (id, vask_id, mentioner_id, mentioned_id, created_at, is_read)
          VALUES (?, ?, ?, ?, ?, 0)
        `);
        insertStmt.run(mentionId, vaskId, mentionerId, user.id, now);
      }
    }
  }

  async getMentionsForUser(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT m.id, m.vask_id, m.mentioner_id, m.mentioned_id, m.created_at, m.is_read,
             v.content, v.created_at as vask_created_at,
             u.unique_id, u.display_name, u.profile_image
      FROM mentions m
      LEFT JOIN vasks v ON m.vask_id = v.id
      LEFT JOIN users u ON m.mentioner_id = u.id
      WHERE m.mentioned_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, limit, offset) as any[];
    return rows.map(row => ({
      id: row.id,
      vaskId: row.vask_id,
      mentionerId: row.mentioner_id,
      mentionedId: row.mentioned_id,
      createdAt: new Date(row.created_at),
      isRead: Boolean(row.is_read),
      vask: {
        content: row.content,
        createdAt: new Date(row.vask_created_at)
      },
      mentioner: {
        uniqueId: row.unique_id,
        displayName: row.display_name,
        profileImage: row.profile_image
      }
    }));
  }

  async markMentionAsRead(mentionId: string): Promise<void> {
    const stmt = sqlite.prepare('UPDATE mentions SET is_read = 1 WHERE id = ?');
    stmt.run(mentionId);
  }

  // Leaderboard methods
  async getReactionLeaderboard(emoji?: string, limit: number = 20): Promise<any[]> {
    let query = `
      SELECT v.id as vask_id, v.content, v.created_at, v.author_id,
             u.unique_id, u.display_name, u.profile_image,
             COUNT(r.id) as reaction_count,
             GROUP_CONCAT(DISTINCT r.emoji) as emojis
      FROM vasks v
      LEFT JOIN reactions r ON v.id = r.vask_id
      LEFT JOIN users u ON v.author_id = u.id
    `;

    if (emoji) {
      query += ` WHERE r.emoji = ?`;
    }

    query += `
      GROUP BY v.id
      HAVING reaction_count > 0
      ORDER BY reaction_count DESC, v.created_at DESC
      LIMIT ?
    `;

    const stmt = sqlite.prepare(query);
    const rows = emoji ? stmt.all(emoji, limit) : stmt.all(limit) as any[];

    return rows.map(row => ({
      vask: {
        id: row.vask_id,
        content: row.content ? row.content.substring(0, 100) : '',
        createdAt: new Date(row.created_at),
        authorId: row.author_id
      },
      author: {
        uniqueId: row.unique_id,
        displayName: row.display_name,
        profileImage: row.profile_image
      },
      reactionCount: row.reaction_count,
      emojis: row.emojis ? row.emojis.split(',') : []
    }));
  }

  // Bookmark methods
  async createBookmark(userId: string, vaskId: string): Promise<void> {
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO bookmarks (user_id, vask_id)
      VALUES (?, ?)
    `);
    stmt.run(userId, vaskId);
  }

  async deleteBookmark(userId: string, vaskId: string): Promise<void> {
    const stmt = sqlite.prepare('DELETE FROM bookmarks WHERE user_id = ? AND vask_id = ?');
    stmt.run(userId, vaskId);
  }

  async getBookmarksForUser(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT v.id as vask_id, v.author_id, v.content, v.content_encrypted, v.image_url, v.image_hash, v.ipfs_hash, 
             v.created_at as vask_created_at, v.is_pinned, v.is_encrypted,
             v.media_urls, v.media_types, v.media_filenames, v.media_sizes,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, u.display_name_encrypted, 
             u.bio, u.bio_encrypted, u.profile_image, u.cover_image, u.created_at as user_created_at,
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.vask_id = v.id) as comment_count,
             (SELECT COUNT(*) FROM likes l WHERE l.vask_id = v.id AND l.user_id = ?) as is_liked,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = v.author_id) as is_following,
             b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN vasks v ON b.vask_id = v.id
      JOIN users u ON v.author_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, userId, userId, limit, offset) as any[];
    
    return rows.map(row => {
      const reactions = this.getReactionsSync(row.vask_id);
      const userReaction = this.getReactionSync(row.vask_id, userId);
      
      return {
        id: row.vask_id,
        authorId: row.author_id,
        content: row.content,
        contentEncrypted: row.content_encrypted,
        imageUrl: row.image_url,
        imageHash: row.image_hash,
        ipfsHash: row.ipfs_hash,
        createdAt: new Date(row.vask_created_at),
        isPinned: Boolean(row.is_pinned),
        isEncrypted: Boolean(row.is_encrypted),
        mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
        mediaTypes: row.media_types ? JSON.parse(row.media_types) : [],
        mediaFilenames: row.media_filenames ? JSON.parse(row.media_filenames) : [],
        mediaSizes: row.media_sizes ? JSON.parse(row.media_sizes) : [],
        author: {
          id: row.user_id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.user_created_at),
          isEncrypted: Boolean(row.is_encrypted),
          isFollowing: Boolean(row.is_following)
        },
        likeCount: row.like_count || 0,
        commentCount: row.comment_count || 0,
        isLiked: Boolean(row.is_liked),
        reactions: reactions,
        userReaction: userReaction?.emoji || null,
        bookmarkedAt: new Date(row.bookmarked_at)
      };
    });
  }

  async isBookmarked(userId: string, vaskId: string): Promise<boolean> {
    const stmt = sqlite.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND vask_id = ? LIMIT 1');
    const result = stmt.get(userId, vaskId);
    return !!result;
  }

  // Notification methods
  async createNotification(notificationData: {
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'mention';
    actorId: string;
    vaskId?: string;
    commentId?: number;
  }): Promise<void> {
    // Don't create notification if user is acting on their own content
    if (notificationData.userId === notificationData.actorId) {
      return;
    }

    const stmt = sqlite.prepare(`
      INSERT INTO notifications (user_id, type, actor_id, vask_id, comment_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      notificationData.userId,
      notificationData.type,
      notificationData.actorId,
      notificationData.vaskId || null,
      notificationData.commentId || null
    );
  }

  async getNotificationsForUser(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT n.*, 
             u.unique_id as actor_unique_id, 
             u.display_name as actor_display_name, 
             u.profile_image as actor_profile_image,
             v.content as vask_content,
             c.content as comment_content
      FROM notifications n
      JOIN users u ON n.actor_id = u.id
      LEFT JOIN vasks v ON n.vask_id = v.id
      LEFT JOIN comments c ON n.comment_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, limit, offset) as any[];
    
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      actorId: row.actor_id,
      vaskId: row.vask_id,
      commentId: row.comment_id,
      isRead: Boolean(row.is_read),
      createdAt: new Date(row.created_at),
      actor: {
        id: row.actor_id,
        uniqueId: row.actor_unique_id,
        displayName: row.actor_display_name,
        profileImage: row.actor_profile_image
      },
      vask: row.vask_id ? {
        id: row.vask_id,
        content: row.vask_content ? row.vask_content.substring(0, 100) : ''
      } : undefined,
      comment: row.comment_id ? {
        id: row.comment_id,
        content: row.comment_content ? row.comment_content.substring(0, 100) : ''
      } : undefined
    }));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const stmt = sqlite.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
    stmt.run(notificationId);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const stmt = sqlite.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0');
    const result = stmt.get(userId) as any;
    return result.count;
  }

  // Comment methods
  async createComment(commentData: any): Promise<Comment> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO comments (id, vask_id, author_id, content, content_encrypted, created_at, is_encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      commentData.vaskId,
      commentData.authorId,
      commentData.content,
      commentData.contentEncrypted ? JSON.stringify(commentData.contentEncrypted) : null,
      now.getTime(),
      commentData.isEncrypted ? 1 : 0
    );
    
    const comment = await this.getComment(id);
    if (!comment) throw new Error('Failed to create comment');
    return comment;
  }

  async getComment(id: string): Promise<Comment | null> {
    const stmt = sqlite.prepare('SELECT * FROM comments WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      vaskId: row.vask_id,
      authorId: row.author_id,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted)
    };
  }

  async getComments(vaskId: string): Promise<CommentWithAuthor[]> {
    const stmt = sqlite.prepare(`
      SELECT c.id as comment_id, c.vask_id, c.author_id, c.content, c.content_encrypted, 
             c.created_at as comment_created_at, c.is_encrypted,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, 
             u.display_name_encrypted, u.bio, u.bio_encrypted, u.profile_image, u.cover_image,
             u.created_at as user_created_at
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.vask_id = ?
      ORDER BY c.created_at DESC
    `);
    
    const rows = stmt.all(vaskId) as any[];
    
    return rows.map(row => ({
      id: row.comment_id,  // Use the aliased comment_id
      vaskId: row.vask_id,
      authorId: row.author_id,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      createdAt: new Date(row.comment_created_at),
      isEncrypted: Boolean(row.is_encrypted),
      author: {
        id: row.user_id,  // Use the aliased user_id
        uniqueId: row.unique_id,
        walletAddress: row.wallet_address,
        ensName: row.ens_name,
        displayName: row.display_name,
        displayNameEncrypted: row.display_name_encrypted,
        bio: row.bio,
        bioEncrypted: row.bio_encrypted,
        profileImage: row.profile_image,
        coverImage: row.cover_image,
        createdAt: new Date(row.user_created_at),
        isEncrypted: Boolean(row.is_encrypted)
      }
    }));
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('DELETE FROM comments WHERE id = ? AND author_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // User settings methods
  async createUserSettings(userId: string, settings: any): Promise<void> {
    const id = randomUUID();
    
    const stmt = sqlite.prepare(`
      INSERT INTO user_settings (id, user_id, theme, preferences)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      userId,
      settings.theme || 'dark',
      settings.preferences ? JSON.stringify(settings.preferences) : null
    );
  }

  async getUserSettings(userId: string): Promise<any> {
    const stmt = sqlite.prepare('SELECT * FROM user_settings WHERE user_id = ?');
    const row = stmt.get(userId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      userId: row.user_id,
      theme: row.theme,
      preferences: row.preferences ? JSON.parse(row.preferences) : null
    };
  }

  async updateUserSettings(userId: string, settings: any): Promise<void> {
    const stmt = sqlite.prepare(`
      UPDATE user_settings 
      SET theme = ?, preferences = ?
      WHERE user_id = ?
    `);
    
    stmt.run(
      settings.theme || 'dark',
      settings.preferences ? JSON.stringify(settings.preferences) : null,
      userId
    );
  }

  // Follow methods
  async followUser(followerId: string, followingId: string): Promise<void> {
    console.log('🔍 followUser called:', { followerId, followingId });
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO follows (id, follower_id, following_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, followerId, followingId, now.getTime());
    console.log('✅ followUser completed successfully');
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    console.log('🔍 unfollowUser called:', { followerId, followingId });
    const stmt = sqlite.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
    const result = stmt.run(followerId, followingId);
    console.log('✅ unfollowUser completed:', { changes: result.changes });
  }

  async getFollow(followerId: string, followingId: string): Promise<any> {
    const stmt = sqlite.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?');
    return stmt.get(followerId, followingId) as any;
  }

  async getFollowers(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT f.*, u.*
      FROM follows f
      LEFT JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset) as any[];
    
    return rows.map(row => ({
          id: row.id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.created_at),
          isEncrypted: Boolean(row.is_encrypted)
    }));
  }

  async getFollowing(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT f.*, u.*
      FROM follows f
      LEFT JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset) as any[];
    
    return rows.map(row => ({
          id: row.id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.created_at),
          isEncrypted: Boolean(row.is_encrypted)
    }));
  }

  async getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    const followersCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?');
    const followingCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');
    
    const followersCount = (followersCountStmt.get(userId) as any)?.count || 0;
    const followingCount = (followingCountStmt.get(userId) as any)?.count || 0;
    
    return { followersCount, followingCount };
  }

  // Search methods
  async searchUsers(query: string, limit: number = 10, offset: number = 0, currentUserId?: string): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM vasks v WHERE v.author_id = u.id) as vask_count,
             (SELECT COUNT(*) FROM likes l LEFT JOIN vasks v ON l.vask_id = v.id WHERE v.author_id = u.id) as like_count,
             (SELECT COUNT(*) FROM comments c LEFT JOIN vasks v ON c.vask_id = v.id WHERE v.author_id = u.id) as comment_count,
             (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
             ${currentUserId ? `(SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = u.id) as is_following` : '0 as is_following'}
      FROM users u
      WHERE u.unique_id LIKE ? OR u.display_name LIKE ? OR u.ens_name LIKE ?
      ${currentUserId ? 'AND u.id != ?' : ''}
      ORDER BY u.created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const searchTerm = `%${query}%`;
    const params = currentUserId ? [currentUserId, searchTerm, searchTerm, searchTerm, currentUserId, limit, offset] : [searchTerm, searchTerm, searchTerm, limit, offset];
    const rows = stmt.all(...params) as any[];
    
    console.log('🔍 searchUsers called with currentUserId:', currentUserId);
    console.log('🔍 searchUsers result sample:', rows.slice(0, 2).map(row => ({
      id: row.id,
      is_following: row.is_following,
      currentUserId
    })));
    
    return rows.map(row => ({
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted),
      vaskCount: row.vask_count || 0,
      likeCount: row.like_count || 0,
      commentCount: row.comment_count || 0,
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      isFollowing: Boolean(row.is_following)
    }));
  }

  async getUserSuggestions(userId: string, limit: number = 10): Promise<any[]> {
    // Get users that the current user doesn't follow yet
    const stmt = sqlite.prepare(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM vasks v WHERE v.author_id = u.id) as vask_count,
             (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as followers_count
      FROM users u
      WHERE u.id != ? 
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY followers_count DESC, vask_count DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(userId, userId, limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted),
      vaskCount: row.vask_count || 0,
      followersCount: row.followers_count || 0,
      isFollowing: false
    }));
  }

  async getTrendingUsers(limit: number = 10, currentUserId?: string): Promise<any[]> {
    // Get trending users (most followers and vasks)
    const stmt = sqlite.prepare(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM vasks v WHERE v.author_id = u.id) as vask_count,
             (SELECT COUNT(*) FROM likes l LEFT JOIN vasks v ON l.vask_id = v.id WHERE v.author_id = u.id) as like_count,
             (SELECT COUNT(*) FROM comments c LEFT JOIN vasks v ON c.vask_id = v.id WHERE v.author_id = u.id) as comment_count,
             (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
             (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
             ${currentUserId ? `(SELECT COUNT(*) FROM follows f WHERE f.follower_id = ? AND f.following_id = u.id) as is_following` : '0 as is_following'}
      FROM users u
      ${currentUserId ? 'WHERE u.id != ?' : ''}
      ORDER BY followers_count DESC, vask_count DESC, like_count DESC
      LIMIT ?
    `);
    
    const params = currentUserId ? [currentUserId, currentUserId, limit] : [limit];
    const rows = stmt.all(...params) as any[];
    
    console.log('🔍 getTrendingUsers called with currentUserId:', currentUserId);
    console.log('🔍 getTrendingUsers result sample:', rows.slice(0, 2).map(row => ({
      id: row.id,
      displayName: row.display_name,
      is_following: row.is_following,
      currentUserId
    })));
    
    return rows.map(row => ({
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted),
      vaskCount: row.vask_count || 0,
      likeCount: row.like_count || 0,
      commentCount: row.comment_count || 0,
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      isFollowing: Boolean(row.is_following)
    }));
  }

  // Admin methods
  async createAdminUser(adminData: any): Promise<any> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO admin_users (id, username, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, adminData.username, adminData.passwordHash, now.getTime());
    
    return {
      id,
      username: adminData.username,
      createdAt: now
    };
  }

  async getAdminUser(username: string): Promise<any> {
    const stmt = sqlite.prepare('SELECT * FROM admin_users WHERE username = ?');
    const row = stmt.get(username) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : null
    };
  }

  async updateAdminLastLogin(username: string): Promise<void> {
    const stmt = sqlite.prepare('UPDATE admin_users SET last_login = ? WHERE username = ?');
    stmt.run(Date.now(), username);
  }

  async updateAdminPassword(username: string, passwordHash: string): Promise<void> {
    const stmt = sqlite.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?');
    stmt.run(passwordHash, username);
  }

  async clearAdminUsers(): Promise<void> {
    const stmt = sqlite.prepare('DELETE FROM admin_users');
    stmt.run();
  }

  // Analytics methods
  async getAnalytics(): Promise<any> {
    const userCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM users');
    const vaskCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM vasks');
    const likeCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM likes');
    const commentCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM comments');
    const pollCountStmt = sqlite.prepare('SELECT COUNT(*) as count FROM polls');

    const userCount = (userCountStmt.get() as any)?.count || 0;
    const vaskCount = (vaskCountStmt.get() as any)?.count || 0;
    const likeCount = (likeCountStmt.get() as any)?.count || 0;
    const commentCount = (commentCountStmt.get() as any)?.count || 0;
    const pollCount = (pollCountStmt.get() as any)?.count || 0;

    return {
      totalUsers: userCount,
      totalVasks: vaskCount,
      totalLikes: likeCount,
      totalComments: commentCount,
      totalPolls: pollCount
    };
  }

  // Admin data methods
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset) as any[];
    
    return rows.map(row => ({
      id: row.id,
      uniqueId: row.unique_id,
      walletAddress: row.wallet_address,
      ensName: row.ens_name,
      displayName: row.display_name,
      displayNameEncrypted: row.display_name_encrypted,
      bio: row.bio,
      bioEncrypted: row.bio_encrypted,
      profileImage: row.profile_image,
      coverImage: row.cover_image,
      createdAt: new Date(row.created_at),
      isEncrypted: Boolean(row.is_encrypted)
    }));
  }

  async getAllVasks(limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT v.*, u.display_name as author_name
      FROM vasks v
      LEFT JOIN users u ON v.author_id = u.id
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset) as any[];
    
    return rows.map(row => ({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
      contentEncrypted: row.content_encrypted,
      imageUrl: row.image_url,
      imageHash: row.image_hash,
      ipfsHash: row.ipfs_hash,
      createdAt: new Date(row.created_at),
      isPinned: Boolean(row.is_pinned),
      isEncrypted: Boolean(row.is_encrypted)
    }));
  }

  async getAllPolls(): Promise<any[]> {
    const stmt = sqlite.prepare(`
      SELECT p.*, u.display_name as creator_name
      FROM polls p
      LEFT JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
        id: row.id,
        creatorId: row.creator_id,
      creatorName: row.creator_name,
        title: row.title,
        titleEncrypted: row.title_encrypted,
        description: row.description,
        descriptionEncrypted: row.description_encrypted,
      options: row.options,
        optionsEncrypted: row.options_encrypted,
        deadline: new Date(row.deadline),
        correctOption: row.correct_option,
        isResolved: Boolean(row.is_resolved),
        isStakingEnabled: Boolean(row.is_staking_enabled),
        totalStaked: row.total_staked,
      votes: row.votes,
      stakes: row.stakes,
      userVotes: row.user_votes,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
          isEncrypted: Boolean(row.is_encrypted)
    }));
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // First, delete all associated data to avoid foreign key constraints
      
      // Delete user's vasks and their associated data
      const userVasks = sqlite.prepare('SELECT id FROM vasks WHERE author_id = ?').all(id);
      for (const vask of userVasks) {
        // Delete likes for this vask
        sqlite.prepare('DELETE FROM likes WHERE vask_id = ?').run((vask as any).id);
        // Delete comments for this vask
        sqlite.prepare('DELETE FROM comments WHERE vask_id = ?').run((vask as any).id);
      }
      // Delete user's vasks
      sqlite.prepare('DELETE FROM vasks WHERE author_id = ?').run(id);
      
      // Delete user's comments
      sqlite.prepare('DELETE FROM comments WHERE author_id = ?').run(id);
      
      // Delete user's polls and their associated data
      const userPolls = sqlite.prepare('SELECT id FROM polls WHERE creator_id = ?').all(id);
      for (const poll of userPolls) {
        // Delete poll votes for this poll
        sqlite.prepare('DELETE FROM poll_votes WHERE poll_id = ?').run((poll as any).id);
      }
      // Delete user's polls
      sqlite.prepare('DELETE FROM polls WHERE creator_id = ?').run(id);
      
      // Delete user's likes
      sqlite.prepare('DELETE FROM likes WHERE user_id = ?').run(id);
      
      // Delete follow relationships where user is follower or following
      sqlite.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(id, id);
      
      // Delete user settings
      sqlite.prepare('DELETE FROM user_settings WHERE user_id = ?').run(id);
      
      // Delete poll votes
      sqlite.prepare('DELETE FROM poll_votes WHERE user_id = ?').run(id);
      
      // Delete chat-related data
      sqlite.prepare('DELETE FROM chat_room_access WHERE user_id = ?').run(id);
      sqlite.prepare('DELETE FROM chat_invitations WHERE inviter_id = ? OR invitee_id = ?').run(id, id);
      sqlite.prepare('DELETE FROM chat_messages WHERE sender_id = ?').run(id);
      sqlite.prepare('DELETE FROM audit_log WHERE user_id = ?').run(id);
      
      // Delete chat rooms created by user
      sqlite.prepare('DELETE FROM chat_rooms WHERE creator_id = ?').run(id);
      
      // Finally, delete the user
      const stmt = sqlite.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async deleteVask(id: string, userId: string): Promise<boolean> {
    // Check if user is admin or author
    if (userId === 'admin') {
      // Delete associated likes and comments first
      const deleteLikesStmt = sqlite.prepare('DELETE FROM likes WHERE vask_id = ?');
      const deleteCommentsStmt = sqlite.prepare('DELETE FROM comments WHERE vask_id = ?');
      const deleteVaskStmt = sqlite.prepare('DELETE FROM vasks WHERE id = ?');
      
      deleteLikesStmt.run(id);
      deleteCommentsStmt.run(id);
      const result = deleteVaskStmt.run(id);
      return result.changes > 0;
    } else {
      // Delete associated likes and comments first
      const deleteLikesStmt = sqlite.prepare('DELETE FROM likes WHERE vask_id = ?');
      const deleteCommentsStmt = sqlite.prepare('DELETE FROM comments WHERE vask_id = ?');
      const deleteVaskStmt = sqlite.prepare('DELETE FROM vasks WHERE id = ? AND author_id = ?');
      
      deleteLikesStmt.run(id);
      deleteCommentsStmt.run(id);
      const result = deleteVaskStmt.run(id, userId);
      return result.changes > 0;
    }
  }

  async deletePoll(id: string, userId: string): Promise<boolean> {
    // Check if user is admin or creator
    if (userId === 'admin') {
      // Delete associated poll votes first
      const deleteVotesStmt = sqlite.prepare('DELETE FROM poll_votes WHERE poll_id = ?');
      const deletePollStmt = sqlite.prepare('DELETE FROM polls WHERE id = ?');
      
      deleteVotesStmt.run(id);
      const result = deletePollStmt.run(id);
      return result.changes > 0;
    } else {
      // Delete associated poll votes first
      const deleteVotesStmt = sqlite.prepare('DELETE FROM poll_votes WHERE poll_id = ?');
      const deletePollStmt = sqlite.prepare('DELETE FROM polls WHERE id = ? AND creator_id = ?');
      
      deleteVotesStmt.run(id);
      const result = deletePollStmt.run(id, userId);
      return result.changes > 0;
    }
  }

  async clearAllData(): Promise<void> {
    const tables = ['likes', 'comments', 'follows', 'poll_votes', 'polls', 'vasks', 'user_settings', 'users', 'admin_users'];
    
    for (const table of tables) {
      const stmt = sqlite.prepare(`DELETE FROM ${table}`);
      stmt.run();
    }
  }

  // Poll methods (simplified for now)
  async createPoll(pollData: any): Promise<Poll> {
    const id = randomUUID();
    const now = new Date();
    
    const stmt = sqlite.prepare(`
      INSERT INTO polls (id, creator_id, title, title_encrypted, description, description_encrypted, options, options_encrypted, deadline, correct_option, is_resolved, is_staking_enabled, total_staked, votes, stakes, user_votes, status, created_at, updated_at, is_encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      pollData.creatorId,
      pollData.title,
      pollData.titleEncrypted || null,
      pollData.description || null,
      pollData.descriptionEncrypted || null,
      JSON.stringify(pollData.options),
      pollData.optionsEncrypted || null,
      pollData.deadline.getTime(),
      pollData.correctOption || null,
      pollData.isResolved ? 1 : 0,
      pollData.isStakingEnabled ? 1 : 0,
      pollData.totalStaked || '0',
      JSON.stringify(pollData.votes || {}),
      JSON.stringify(pollData.stakes || {}),
      JSON.stringify(pollData.userVotes || {}),
      pollData.status || 'active',
      now.getTime(),
      now.getTime(),
      pollData.isEncrypted ? 1 : 0
    );
    
    const poll = await this.getPoll(id);
    if (!poll) throw new Error('Failed to create poll');
    return poll;
  }

  async getPoll(id: string, currentUserId?: string): Promise<Poll | null> {
    const stmt = sqlite.prepare('SELECT * FROM polls WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    // Parse options from JSON string to array
    let options: string[] = [];
    try {
      options = JSON.parse(row.options || '[]');
    } catch (e) {
      console.error('Failed to parse poll options:', e);
      options = [];
    }

    // Calculate votes and stakes for each option
    const votes: number[] = new Array(options.length).fill(0);
    const stakes: number[] = new Array(options.length).fill(0);
    
    const votesStmt = sqlite.prepare('SELECT option, stake_amount FROM poll_votes WHERE poll_id = ?');
    const pollVotes = votesStmt.all(id) as any[];
    
    pollVotes.forEach(vote => {
      const optionIndex = Number(vote.option);
      if (optionIndex >= 0 && optionIndex < options.length) {
        votes[optionIndex]++;
        stakes[optionIndex] += parseFloat(vote.stake_amount || '0');
      }
    });

    // Calculate dynamic status based on deadline and current time
    const now = new Date();
    const deadline = new Date(row.deadline);
    const isResolved = Boolean(row.is_resolved);
    const isExpired = now >= deadline;
    
    let dynamicStatus: string;
    if (isResolved) {
      dynamicStatus = 'resolved';
    } else if (isExpired) {
      dynamicStatus = 'closed';
    } else {
      dynamicStatus = 'active';
    }
      
    return {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      titleEncrypted: row.title_encrypted,
      description: row.description,
      descriptionEncrypted: row.description_encrypted,
      options: options, // Return as array
      optionsEncrypted: row.options_encrypted,
      deadline: deadline,
      correctOption: row.correct_option,
      isResolved: isResolved,
      isStakingEnabled: Boolean(row.is_staking_enabled),
      totalStaked: row.total_staked,
      votes: votes, // Return as array
      stakes: stakes, // Return as array
      userVotes: row.user_votes,
      status: dynamicStatus, // Use calculated status instead of stored status
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isEncrypted: Boolean(row.is_encrypted)
    };
  }

  async getPolls(limit: number = 50, offset: number = 0, currentUserId?: string): Promise<PollWithCreator[]> {
    const stmt = sqlite.prepare(`
      SELECT p.id as poll_id, p.creator_id, p.title, p.title_encrypted, p.description, p.description_encrypted, 
             p.options, p.options_encrypted, p.deadline, p.correct_option, p.is_resolved, 
             p.is_staking_enabled, p.total_staked, p.votes, p.stakes, p.user_votes, p.status, 
             p.created_at, p.updated_at, p.is_encrypted,
             u.id as user_id, u.unique_id, u.wallet_address, u.ens_name, u.display_name, 
             u.display_name_encrypted, u.bio, u.bio_encrypted, u.profile_image, u.cover_image, 
             u.created_at as user_created_at,
             (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id) as total_votes
      FROM polls p
      LEFT JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset) as any[];
    
    return Promise.all(rows.map(async row => {
      // Parse options
      let options: string[] = [];
      try {
        options = JSON.parse(row.options || '[]');
      } catch (e) {
        console.error('Failed to parse poll options:', e);
        options = [];
      }

      // Calculate votes and stakes for each option
      const votes: number[] = new Array(options.length).fill(0);
      const stakes: number[] = new Array(options.length).fill(0);
      
      const votesStmt = sqlite.prepare('SELECT option, stake_amount FROM poll_votes WHERE poll_id = ?');
      const pollVotes = votesStmt.all(row.poll_id) as any[];
      
      pollVotes.forEach(vote => {
        const optionIndex = Number(vote.option);
        if (optionIndex >= 0 && optionIndex < options.length) {
          votes[optionIndex]++;
          stakes[optionIndex] += parseFloat(vote.stake_amount || '0');
        }
      });

      // Get current user's vote if provided
      let userVote: any = undefined;
      if (currentUserId) {
        const userVoteStmt = sqlite.prepare('SELECT option, stake_amount, created_at FROM poll_votes WHERE poll_id = ? AND user_id = ?');
        const userVoteData = userVoteStmt.get(row.poll_id, currentUserId) as any;
        
        if (userVoteData) {
          userVote = {
            option: Number(userVoteData.option),
            stakeAmount: userVoteData.stake_amount || '0',
            timestamp: new Date(userVoteData.created_at).getTime()
          };
        }
      }

      // Calculate dynamic status based on deadline and current time
      const now = new Date();
      const deadline = new Date(row.deadline);
      const isResolved = Boolean(row.is_resolved);
      const isExpired = now >= deadline;
      
      let dynamicStatus: string;
      if (isResolved) {
        dynamicStatus = 'resolved';
      } else if (isExpired) {
        dynamicStatus = 'closed';
      } else {
        dynamicStatus = 'active';
      }

      return {
        id: row.poll_id,
        creatorId: row.creator_id,
        title: row.title,
        titleEncrypted: row.title_encrypted,
        description: row.description,
        descriptionEncrypted: row.description_encrypted,
        options: options, // Return as array for client consumption
        optionsEncrypted: row.options_encrypted,
        deadline: deadline,
        correctOption: row.correct_option,
        isResolved: isResolved,
        isStakingEnabled: Boolean(row.is_staking_enabled),
        totalStaked: row.total_staked,
        votes: votes, // Return as array for client consumption
        stakes: stakes, // Return as array for client consumption
        userVotes: row.user_votes,
        status: dynamicStatus, // Use calculated status instead of stored status
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isEncrypted: Boolean(row.is_encrypted),
        creator: {
          id: row.user_id,
          uniqueId: row.unique_id,
          walletAddress: row.wallet_address,
          ensName: row.ens_name,
          displayName: row.display_name,
          displayNameEncrypted: row.display_name_encrypted,
          bio: row.bio,
          bioEncrypted: row.bio_encrypted,
          profileImage: row.profile_image,
          coverImage: row.cover_image,
          createdAt: new Date(row.user_created_at),
          isEncrypted: Boolean(row.is_encrypted)
        },
        totalVotes: Number(row.total_votes) || 0,
        userVote: userVote
      } as any; // Cast to any to handle interface mismatch
    }));
  }

  async voteOnPoll(pollId: string, userId: string, option: number, stakeAmount: string = '0'): Promise<boolean> {
    try {
      console.log(`🗳️ voteOnPoll called: pollId=${pollId}, userId=${userId}, option=${option}, stakeAmount=${stakeAmount}`);
      
      // Check if poll exists
      const pollExists = sqlite.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
      if (!pollExists) {
        console.log(`❌ Poll ${pollId} does not exist`);
        return false;
      }
      
      // Check if user exists (for testing, we'll allow any userId)
      // In a real app, you might want to validate the user exists
      console.log(`✅ Poll ${pollId} exists, proceeding with vote`);
      
      // Check if user already voted
      const existingVote = sqlite.prepare('SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
      if (existingVote) {
        console.log(`❌ User ${userId} already voted on poll ${pollId}`);
        return false; // User already voted
      }

      const id = randomUUID();
      const now = new Date();
      
      console.log(`📝 Inserting vote: id=${id}, pollId=${pollId}, userId=${userId}, option=${option}, stakeAmount=${stakeAmount}, timestamp=${now.getTime()}`);
      
      const stmt = sqlite.prepare(`
        INSERT INTO poll_votes (id, poll_id, user_id, option, stake_amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(id, pollId, userId, option, stakeAmount, now.getTime());
      console.log(`✅ Vote inserted successfully: changes=${result.changes}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error in voteOnPoll:', error);
      return false;
    }
  }

  // Modular access control function for creator-only actions
  async verifyPollCreatorAccess(pollId: string, userId: string): Promise<void> {
    const pollStmt = sqlite.prepare('SELECT creator_id FROM polls WHERE id = ?');
    const poll = pollStmt.get(pollId) as any;
    
    if (!poll) {
      throw new Error('Poll not found');
    }
    
    // Get the user
    const userStmt = sqlite.prepare('SELECT id FROM users WHERE id = ?');
    const user = userStmt.get(userId) as any;
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if the user is the poll creator
    if (poll.creator_id !== user.id) {
      throw new Error('Only the poll creator can perform this action');
    }
  }

  async resolvePoll(pollId: string, correctOption: number, resolvedBy: string): Promise<boolean> {
    // Verify creator access
    await this.verifyPollCreatorAccess(pollId, resolvedBy);
    
    // Update the poll status
    const stmt = sqlite.prepare('UPDATE polls SET correct_option = ?, is_resolved = 1, status = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(correctOption, 'resolved', Date.now(), pollId);
    return result.changes > 0;
  }

  async closePoll(pollId: string, closedBy: string): Promise<boolean> {
    // Verify creator access
    await this.verifyPollCreatorAccess(pollId, closedBy);
    
    // Update the poll status to closed
    const stmt = sqlite.prepare('UPDATE polls SET status = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run('closed', Date.now(), pollId);
    return result.changes > 0;
  }

  async hasUserVoted(pollId: string, userAddress: string): Promise<boolean> {
    // First get user by wallet address
    const user = await this.getUserByWalletAddress(userAddress);
    if (!user) return false;
    
    const stmt = sqlite.prepare('SELECT COUNT(*) as count FROM poll_votes WHERE poll_id = ? AND user_id = ?');
    const result = stmt.get(pollId, user.id);
    return (result as any)?.count > 0;
  }

  async getUserVote(pollId: string, userAddress: string): Promise<any> {
    // First get user by wallet address
    const user = await this.getUserByWalletAddress(userAddress);
    if (!user) return null;
    
    const stmt = sqlite.prepare('SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?');
    const row = stmt.get(pollId, user.id) as any;
    
    if (!row) return null;
    
    return {
      option: row.option,
      stakeAmount: row.stake_amount,
      timestamp: new Date(row.created_at).getTime()
    };
  }

  // Chat Rooms methods
  async getChatRooms(limit: number, offset: number, currentUserId?: string, search?: string, type?: string): Promise<any[]> {
    let query = `
      SELECT 
        cr.*,
        u.display_name as creator_name,
        u.unique_id as creator_username,
        u.wallet_address as creator_address,
        (SELECT COUNT(*) FROM json_each(cr.participants)) as participant_count,
        CASE WHEN ? IS NOT NULL AND json_extract(cr.participants, '$') LIKE '%' || ? || '%' THEN 1 ELSE 0 END as is_joined
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.creator_id = u.id
      WHERE cr.is_active = 1
    `;
    
    const params: any[] = [currentUserId, currentUserId];
    
    if (search) {
      query += ` AND (cr.name LIKE ? OR cr.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (type && type !== 'all') {
      query += ` AND cr.type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY cr.last_activity DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const stmt = sqlite.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      creator: {
        id: row.creator_id,
        name: row.creator_name,
        username: row.creator_username,
        address: row.creator_address
      },
      participants: JSON.parse(row.participants || '[]'),
      participantCount: row.participant_count,
      maxParticipants: row.max_participants,
      firstMessage: row.first_message,
      createdAt: row.created_at,
      lastActivity: row.last_activity,
      isJoined: row.is_joined === 1
    }));
  }

  async createChatRoom(name: string, type: 'public' | 'private', description: string, creatorId: string, firstMessage: string, password?: string): Promise<ChatRoom> {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // Hash password if provided
    let passwordHash = null;
    if (password && type === 'private') {
      const bcrypt = await import('bcrypt');
      passwordHash = await bcrypt.hash(password, 12);
    }
    
    const stmt = sqlite.prepare(`
      INSERT INTO chat_rooms (id, name, type, description, creator_id, participants, max_participants, first_message, password_hash, created_at, last_activity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const participants = JSON.stringify([creatorId]);
    const maxParticipants = type === 'public' ? 100 : 50;
    
    stmt.run(id, name, type, description, creatorId, participants, maxParticipants, firstMessage, passwordHash, now, now, 1);
    
    // Add creator to access table
    const accessId = randomUUID();
    const accessStmt = sqlite.prepare(`
      INSERT INTO chat_room_access (id, room_id, user_id, access_type, granted_at)
      VALUES (?, ?, ?, 'creator', ?)
    `);
    accessStmt.run(accessId, id, creatorId, now);
    
    return {
      id,
      name,
      type,
      description,
      creatorId,
      participants,
      maxParticipants,
      firstMessage,
      passwordHash,
      createdAt: new Date(now),
      lastActivity: new Date(now),
      isActive: true
    };
  }

  // Chat room access and invitation methods
  async createChatInvitation(roomId: string, inviterId: string, inviteeId: string): Promise<ChatInvitation> {
    const id = randomUUID();
    const invitationToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const stmt = sqlite.prepare(`
      INSERT INTO chat_invitations (id, room_id, inviter_id, invitee_id, invitation_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, roomId, inviterId, inviteeId, invitationToken, expiresAt.toISOString(), now.toISOString());
    
    return {
      id,
      roomId,
      inviterId,
      inviteeId,
      status: 'pending',
      invitationToken,
      expiresAt,
      createdAt: now
    };
  }

  async getChatInvitations(userId: string): Promise<ChatInvitation[]> {
    const stmt = sqlite.prepare(`
      SELECT ci.*, cr.name as room_name, u.display_name as inviter_name
      FROM chat_invitations ci
      LEFT JOIN chat_rooms cr ON ci.room_id = cr.id
      LEFT JOIN users u ON ci.inviter_id = u.id
      WHERE ci.invitee_id = ? AND ci.status = 'pending' AND ci.expires_at > datetime('now')
      ORDER BY ci.created_at DESC
    `);
    
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      roomId: row.room_id,
      inviterId: row.inviter_id,
      inviteeId: row.invitee_id,
      status: row.status,
      invitationToken: row.invitation_token,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined
    }));
  }

  async respondToInvitation(invitationToken: string, userId: string, response: 'accepted' | 'declined'): Promise<boolean> {
    const stmt = sqlite.prepare(`
      UPDATE chat_invitations 
      SET status = ?, responded_at = datetime('now')
      WHERE invitation_token = ? AND invitee_id = ? AND status = 'pending' AND expires_at > datetime('now')
    `);
    
    const result = stmt.run(response, invitationToken, userId);
    
    if (result.changes > 0 && response === 'accepted') {
      // Add user to room access
      const invitationStmt = sqlite.prepare('SELECT room_id FROM chat_invitations WHERE invitation_token = ?');
      const invitation = invitationStmt.get(invitationToken) as any;
      
      if (invitation) {
        const accessId = randomUUID();
        const accessStmt = sqlite.prepare(`
          INSERT INTO chat_room_access (id, room_id, user_id, access_type, granted_at)
          VALUES (?, ?, ?, 'invited', datetime('now'))
        `);
        accessStmt.run(accessId, invitation.room_id, userId);
        
        // Add to participants
        const roomStmt = sqlite.prepare('SELECT participants FROM chat_rooms WHERE id = ?');
        const room = roomStmt.get(invitation.room_id) as any;
        const participants = JSON.parse(room.participants || '[]');
        participants.push(userId);
        
        const updateStmt = sqlite.prepare('UPDATE chat_rooms SET participants = ? WHERE id = ?');
        updateStmt.run(JSON.stringify(participants), invitation.room_id);
      }
    }
    
    return result.changes > 0;
  }

  async verifyChatRoomAccess(roomId: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare(`
      SELECT 1 FROM chat_room_access 
      WHERE room_id = ? AND user_id = ?
    `);
    
    const result = stmt.get(roomId, userId);
    return !!result;
  }

  async verifyChatRoomPassword(roomId: string, password: string): Promise<boolean> {
    const stmt = sqlite.prepare('SELECT password_hash, type FROM chat_rooms WHERE id = ?');
    const row = stmt.get(roomId) as any;
    
    if (!row || !row.password_hash || row.type !== 'private') {
      return false;
    }
    
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(password, row.password_hash);
  }

  async grantPasswordAccess(roomId: string, userId: string): Promise<void> {
    // Check if user already has access
    const existingAccess = sqlite.prepare(`
      SELECT id FROM chat_room_access WHERE room_id = ? AND user_id = ?
    `).get(roomId, userId);
    
    if (existingAccess) {
      // User already has access, no need to add again
      return;
    }
    
    const accessId = randomUUID();
    const stmt = sqlite.prepare(`
      INSERT INTO chat_room_access (id, room_id, user_id, access_type, granted_at)
      VALUES (?, ?, ?, 'password_joined', datetime('now'))
    `);
    stmt.run(accessId, roomId, userId);
    
    // Add to participants
    const roomStmt = sqlite.prepare('SELECT participants FROM chat_rooms WHERE id = ?');
    const room = roomStmt.get(roomId) as any;
    const participants = JSON.parse(room.participants || '[]');
    if (!participants.includes(userId)) {
      participants.push(userId);
      const updateStmt = sqlite.prepare('UPDATE chat_rooms SET participants = ? WHERE id = ?');
      updateStmt.run(JSON.stringify(participants), roomId);
    }
  }

  async joinChatRoom(roomId: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('SELECT participants FROM chat_rooms WHERE id = ?');
    const row = stmt.get(roomId) as any;
    
    if (!row) return false;
    
    const participants = JSON.parse(row.participants || '[]');
    if (!participants.includes(userId)) {
      participants.push(userId);
      
      const updateStmt = sqlite.prepare('UPDATE chat_rooms SET participants = ?, last_activity = ? WHERE id = ?');
      updateStmt.run(JSON.stringify(participants), new Date().toISOString(), roomId);
    }
    
    return true;
  }

  async leaveChatRoom(roomId: string, userId: string): Promise<boolean> {
    const stmt = sqlite.prepare('SELECT participants FROM chat_rooms WHERE id = ?');
    const row = stmt.get(roomId) as any;
    
    if (!row) return false;
    
    const participants = JSON.parse(row.participants || '[]');
    const updatedParticipants = participants.filter((id: string) => id !== userId);
    
    const updateStmt = sqlite.prepare('UPDATE chat_rooms SET participants = ?, last_activity = ? WHERE id = ?');
    updateStmt.run(JSON.stringify(updatedParticipants), new Date().toISOString(), roomId);
    
    return true;
  }

  async getChatRoom(roomId: string): Promise<ChatRoom | null> {
    const stmt = sqlite.prepare(`
      SELECT cr.*, u.display_name as creator_name, u.wallet_address as creator_address
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.creator_id = u.id
      WHERE cr.id = ?
    `);
    
    const row = stmt.get(roomId) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      creatorId: row.creator_id,
      participants: row.participants,
      maxParticipants: row.max_participants,
      firstMessage: row.first_message,
      createdAt: new Date(row.created_at),
      lastActivity: new Date(row.last_activity),
      isActive: row.is_active === 1,
    };
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    const stmt = sqlite.prepare(`
      SELECT cm.*, u.display_name as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = ?
      ORDER BY cm.timestamp ASC
    `);
    
    const rows = stmt.all(roomId) as any[];
    return rows.map(row => ({
      id: row.id,
      roomId: row.room_id,
      content: row.content,
      senderId: row.sender_id,
      senderName: row.sender_name || 'Unknown',
      messageType: row.message_type || 'text',
      mediaUrl: row.media_url,
      mediaFilename: row.media_filename,
      mediaSize: row.media_size,
      timestamp: new Date(row.timestamp),
    }));
  }

  async createChatMessage(
    roomId: string, 
    content: string, 
    senderId: string, 
    messageType: 'text' | 'image' | 'video' | 'file' = 'text',
    mediaUrl?: string,
    mediaFilename?: string,
    mediaSize?: number
  ): Promise<ChatMessage> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    // Get sender name
    const userStmt = sqlite.prepare('SELECT display_name FROM users WHERE id = ?');
    const user = userStmt.get(senderId) as any;
    const senderName = user?.display_name || 'Unknown';
    
    const stmt = sqlite.prepare(`
      INSERT INTO chat_messages (id, room_id, content, sender_id, message_type, media_url, media_filename, media_size, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, roomId, content, senderId, messageType, mediaUrl, mediaFilename, mediaSize, now.toISOString());
    
    // Update room's last activity
    const updateStmt = sqlite.prepare('UPDATE chat_rooms SET last_activity = ? WHERE id = ?');
    updateStmt.run(now.toISOString(), roomId);
    
    return {
      id,
      roomId,
      content,
      senderId,
      senderName,
      messageType,
      mediaUrl,
      mediaFilename,
      mediaSize,
      timestamp: now,
    };
  }

  // Chat Room methods

  async deleteChatRoom(id: string): Promise<boolean> {
    try {
      // Delete related data first
      const deleteMessages = sqlite.prepare('DELETE FROM chat_messages WHERE room_id = ?');
      deleteMessages.run(id);
      
      // Delete chat room access records
      const deleteAccess = sqlite.prepare('DELETE FROM chat_room_access WHERE room_id = ?');
      deleteAccess.run(id);
      
      // Delete chat room invitations
      const deleteInvitations = sqlite.prepare('DELETE FROM chat_invitations WHERE room_id = ?');
      deleteInvitations.run(id);
      
      // Delete the chat room
      const deleteRoom = sqlite.prepare('DELETE FROM chat_rooms WHERE id = ?');
      const result = deleteRoom.run(id);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting chat room:', error);
      return false;
    }
  }

  // Encryption methods

  /**
   * Generate encryption keys for a user
   */
  async generateUserEncryptionKeys(userId: string): Promise<EncryptionKeys> {
    const keys = EndToEndEncryption.generateKeyPair();
    
    const stmt = sqlite.prepare(`
      UPDATE users 
      SET encryption_key = ?, public_key = ?, private_key = ?
      WHERE id = ?
    `);
    
    stmt.run(keys.secretKey, keys.publicKey, keys.privateKey, userId);
    
    return keys;
  }

  /**
   * Get user encryption keys
   */
  async getUserEncryptionKeys(userId: string): Promise<EncryptionKeys | null> {
    const stmt = sqlite.prepare('SELECT encryption_key, public_key, private_key FROM users WHERE id = ?');
    const row = stmt.get(userId) as any;
    
    if (!row || !row.encryption_key) return null;
    
    return {
      secretKey: row.encryption_key,
      publicKey: row.public_key,
      privateKey: row.private_key
    };
  }

  /**
   * Encrypt and store chat message
   */
  async createEncryptedChatMessage(
    roomId: string, 
    content: string, 
    senderId: string, 
    messageType: string = 'text',
    mediaUrl?: string,
    mediaFilename?: string,
    mediaSize?: number
  ): Promise<ChatMessage> {
    const id = randomUUID();
    const now = new Date();
    
    // Get sender name
    const userStmt = sqlite.prepare('SELECT display_name FROM users WHERE id = ?');
    const user = userStmt.get(senderId) as any;
    const senderName = user?.display_name || 'Unknown';
    
    // Get sender's encryption key
    const senderKeys = await this.getUserEncryptionKeys(senderId);
    if (!senderKeys) {
      throw new Error('Sender encryption keys not found');
    }
    
    // Encrypt the message content
    const encryptedData = EndToEndEncryption.encryptData(content, senderKeys.secretKey);
    
    const stmt = sqlite.prepare(`
      INSERT INTO chat_messages (
        id, room_id, content, encrypted_content, encryption_key, is_encrypted,
        sender_id, message_type, media_url, media_filename, media_size, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, roomId, content, JSON.stringify(encryptedData), senderKeys.secretKey, 1,
      senderId, messageType, mediaUrl, mediaFilename, mediaSize, now.toISOString()
    );
    
    // Update room's last activity
    const updateStmt = sqlite.prepare('UPDATE chat_rooms SET last_activity = ? WHERE id = ?');
    updateStmt.run(now.toISOString(), roomId);
    
    return {
      id,
      roomId,
      content,
      senderId,
      senderName,
      messageType,
      mediaUrl,
      mediaFilename,
      mediaSize,
      timestamp: now,
    };
  }

  /**
   * Decrypt chat message for recipient
   */
  async decryptChatMessage(messageId: string, recipientId: string): Promise<string> {
    const stmt = sqlite.prepare(`
      SELECT encrypted_content, encryption_key, is_encrypted 
      FROM chat_messages 
      WHERE id = ?
    `);
    const row = stmt.get(messageId) as any;
    
    if (!row) {
      throw new Error('Message not found');
    }
    
    if (!row.is_encrypted) {
      return row.content; // Return plain text if not encrypted
    }
    
    try {
      const encryptedData = JSON.parse(row.encrypted_content);
      const decryptedContent = EndToEndEncryption.decryptData(encryptedData, row.encryption_key);
      return decryptedContent;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return '[Encrypted message - decryption failed]';
    }
  }

  /**
   * Get encrypted chat messages for a room
   */
  async getEncryptedChatMessages(roomId: string, currentUserId: string): Promise<ChatMessage[]> {
    const stmt = sqlite.prepare(`
      SELECT 
        cm.*,
        u.display_name as sender_name,
        CASE WHEN cm.sender_id = ? THEN 1 ELSE 0 END as is_own
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = ?
      ORDER BY cm.timestamp ASC
    `);
    
    const rows = stmt.all(currentUserId, roomId) as any[];
    
    return rows.map(row => {
      let content = row.content;
      
      // Decrypt if message is encrypted
      if (row.is_encrypted) {
        try {
          const encryptedData = JSON.parse(row.encrypted_content);
          content = EndToEndEncryption.decryptData(encryptedData, row.encryption_key);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          content = '[Encrypted message - decryption failed]';
        }
      }
      
      return {
        id: row.id,
        roomId: row.room_id,
        content,
        senderId: row.sender_id,
        senderName: row.sender_name || 'Unknown',
        messageType: row.message_type,
        mediaUrl: row.media_url,
        mediaFilename: row.media_filename,
        mediaSize: row.media_size,
        timestamp: new Date(row.timestamp),
      };
    });
  }

  /**
   * Encrypt and store vask
   */
  async createEncryptedVask(
    authorId: string,
    content: string,
    imageUrl?: string,
    imageHash?: string,
    ipfsHash?: string,
    mediaUrls?: string[],
    mediaTypes?: string[],
    mediaFilenames?: string[],
    mediaSizes?: number[]
  ): Promise<Vask> {
    const id = randomUUID();
    const now = new Date();
    
    // Get author's encryption key
    const authorKeys = await this.getUserEncryptionKeys(authorId);
    if (!authorKeys) {
      throw new Error('Author encryption keys not found');
    }
    
    // Encrypt the vask content
    const encryptedData = EndToEndEncryption.encryptData(content, authorKeys.secretKey);
    
    const stmt = sqlite.prepare(`
      INSERT INTO vasks (
        id, author_id, content, encrypted_content, encryption_key, is_encrypted,
        image_url, image_hash, ipfs_hash, media_urls, media_types, media_filenames, media_sizes,
        created_at, is_pinned
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, authorId, content, JSON.stringify(encryptedData), authorKeys.secretKey, 1,
      imageUrl, imageHash, ipfsHash, 
      JSON.stringify(mediaUrls || []), 
      JSON.stringify(mediaTypes || []), 
      JSON.stringify(mediaFilenames || []), 
      JSON.stringify(mediaSizes || []),
      now.getTime(), 0
    );
    
    return {
      id,
      authorId,
      content,
      imageUrl,
      imageHash,
      ipfsHash,
      createdAt: now,
      isPinned: false,
      isEncrypted: true,
      mediaUrls,
      mediaTypes,
      mediaFilenames,
      mediaSizes
    };
  }

  /**
   * Decrypt vask content
   */
  async decryptVaskContent(vaskId: string, userId: string): Promise<string> {
    const stmt = sqlite.prepare(`
      SELECT encrypted_content, encryption_key, is_encrypted, content
      FROM vasks 
      WHERE id = ?
    `);
    const row = stmt.get(vaskId) as any;
    
    if (!row) {
      throw new Error('Vask not found');
    }
    
    if (!row.is_encrypted) {
      return row.content; // Return plain text if not encrypted
    }
    
    try {
      const encryptedData = JSON.parse(row.encrypted_content);
      const decryptedContent = EndToEndEncryption.decryptData(encryptedData, row.encryption_key);
      return decryptedContent;
    } catch (error) {
      console.error('Failed to decrypt vask:', error);
      return '[Encrypted content - decryption failed]';
    }
  }

  /**
   * Encrypt and store comment
   */
  async createEncryptedComment(
    vaskId: string,
    authorId: string,
    content: string
  ): Promise<Comment> {
    const id = randomUUID();
    const now = new Date();
    
    // Get author's encryption key
    const authorKeys = await this.getUserEncryptionKeys(authorId);
    if (!authorKeys) {
      throw new Error('Author encryption keys not found');
    }
    
    // Encrypt the comment content
    const encryptedData = EndToEndEncryption.encryptData(content, authorKeys.secretKey);
    
    const stmt = sqlite.prepare(`
      INSERT INTO comments (
        id, vask_id, author_id, content, encrypted_content, encryption_key, is_encrypted, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, vaskId, authorId, content, JSON.stringify(encryptedData), authorKeys.secretKey, 1, now.getTime()
    );
    
    return {
      id,
      vaskId,
      authorId,
      content,
      createdAt: now,
      isEncrypted: true
    };
  }

  /**
   * Decrypt comment content
   */
  async decryptCommentContent(commentId: string, userId: string): Promise<string> {
    const stmt = sqlite.prepare(`
      SELECT encrypted_content, encryption_key, is_encrypted, content
      FROM comments 
      WHERE id = ?
    `);
    const row = stmt.get(commentId) as any;
    
    if (!row) {
      throw new Error('Comment not found');
    }
    
    if (!row.is_encrypted) {
      return row.content; // Return plain text if not encrypted
    }
    
    try {
      const encryptedData = JSON.parse(row.encrypted_content);
      const decryptedContent = EndToEndEncryption.decryptData(encryptedData, row.encryption_key);
      return decryptedContent;
    } catch (error) {
      console.error('Failed to decrypt comment:', error);
      return '[Encrypted comment - decryption failed]';
    }
  }

  /**
   * Log encryption events for audit
   */
  async logEncryptionEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    encryptionStatus: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const stmt = sqlite.prepare(`
      INSERT INTO audit_log (
        user_id, action, resource_type, resource_id, encryption_status, ip_address, user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, action, resourceType, resourceId, encryptionStatus, ipAddress, userAgent);
  }




}

export const storage = new SimpleSQLiteStorage();
