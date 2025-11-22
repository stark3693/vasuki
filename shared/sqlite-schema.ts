import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  uniqueId: text("unique_id").notNull().unique(),
  walletAddress: text("wallet_address").notNull().unique(),
  ensName: text("ens_name"),
  displayName: text("display_name"),
  displayNameEncrypted: text("display_name_encrypted"), // Store as JSON string
  bio: text("bio"),
  bioEncrypted: text("bio_encrypted"), // Store as JSON string
  profileImage: text("profile_image"),
  coverImage: text("cover_image"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  isEncrypted: integer("is_encrypted", { mode: "boolean" }).default(false),
});

export const vasks = sqliteTable("vasks", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content"),
  contentEncrypted: text("content_encrypted"), // Store as JSON string
  imageUrl: text("image_url"),
  imageHash: text("image_hash"),
  ipfsHash: text("ipfs_hash"),
  mediaUrls: text("media_urls"), // Store as JSON string
  mediaTypes: text("media_types"), // Store as JSON string
  mediaFilenames: text("media_filenames"), // Store as JSON string
  mediaSizes: text("media_sizes"), // Store as JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
  isEncrypted: integer("is_encrypted", { mode: "boolean" }).default(false),
});

export const likes = sqliteTable("likes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  vaskId: text("vask_id").notNull().references(() => vasks.id),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  vaskId: text("vask_id").notNull().references(() => vasks.id),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  contentEncrypted: text("content_encrypted"), // Store as JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  isEncrypted: integer("is_encrypted", { mode: "boolean" }).default(false),
});

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  theme: text("theme").default("dark"),
  preferences: text("preferences"), // Store as JSON string
});

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  creatorId: text("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  titleEncrypted: text("title_encrypted"), // Store as JSON string
  description: text("description"),
  descriptionEncrypted: text("description_encrypted"), // Store as JSON string
  options: text("options").notNull(), // Store as JSON string
  optionsEncrypted: text("options_encrypted"), // Store as JSON string
  deadline: integer("deadline", { mode: "timestamp" }).notNull(),
  correctOption: integer("correct_option"),
  isResolved: integer("is_resolved", { mode: "boolean" }).default(false),
  isStakingEnabled: integer("is_staking_enabled", { mode: "boolean" }).default(false),
  totalStaked: text("total_staked").default("0"),
  votes: text("votes").default("{}"), // Store as JSON string
  stakes: text("stakes").default("{}"), // Store as JSON string
  userVotes: text("user_votes").default("{}"), // Store as JSON string
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  isEncrypted: integer("is_encrypted", { mode: "boolean" }).default(false),
});

export const pollVotes = sqliteTable("poll_votes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  pollId: text("poll_id").notNull().references(() => polls.id),
  userId: text("user_id").notNull().references(() => users.id),
  option: integer("option").notNull(),
  stakeAmount: text("stake_amount").default("0"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const follows = sqliteTable("follows", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  followerId: text("follower_id").notNull().references(() => users.id),
  followingId: text("following_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastLogin: integer("last_login", { mode: "timestamp" }),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  uniqueId: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores"),
});

export const insertVaskSchema = createInsertSchema(vasks).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imageHash: z.string().optional().nullable(),
  ipfsHash: z.string().optional().nullable(),
  contentEncrypted: z.any().optional().nullable(),
  mediaUrls: z.array(z.string()).optional().default([]),
  mediaTypes: z.array(z.string()).optional().default([]),
  mediaFilenames: z.array(z.string()).optional().default([]),
  mediaSizes: z.array(z.number()).optional().default([]),
  isEncrypted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
}).refine(
  (data) => data.content || data.imageUrl || data.imageHash || data.ipfsHash || (data.mediaUrls && data.mediaUrls.length > 0),
  {
    message: "Either content, imageUrl, imageHash, ipfsHash, or mediaUrls must be provided",
    path: ["content"],
  }
);

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().min(1).max(1000),
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  votes: true,
  stakes: true,
  userVotes: true,
  correctOption: true,
  isResolved: true,
  totalStaked: true,
}).extend({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  deadline: z.date(),
  isStakingEnabled: z.boolean().default(false),
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  createdAt: true,
}).extend({
  option: z.number().min(0),
  stakeAmount: z.string().default("0"),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
}).extend({
  username: z.string().min(3).max(50),
  passwordHash: z.string().min(1),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVask = z.infer<typeof insertVaskSchema>;
export type Vask = typeof vasks.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof polls.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;
export type PollVote = typeof pollVotes.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Extended types for API responses
export type VaskWithAuthor = Vask & {
  author: User & {
    isFollowing?: boolean;
  };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
};

export type CommentWithAuthor = Comment & {
  author: User;
};

export type PollWithCreator = Poll & {
  creator: User;
  totalVotes: number;
  userVote?: {
    option: number;
    stakeAmount: string;
    timestamp: number;
  };
};

export type UserProfile = User & {
  vaskCount: number;
  likeCount: number;
  commentCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
};

// Schema for updating username
export const updateUsernameSchema = z.object({
  uniqueId: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores"),
});

export type UpdateUsername = z.infer<typeof updateUsernameSchema>;

