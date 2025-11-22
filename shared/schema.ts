import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueId: varchar("unique_id").notNull().unique(), // e.g., "vasukii_3942"
  walletAddress: text("wallet_address").notNull().unique(),
  ensName: text("ens_name"),
  displayName: text("display_name"), // Will store encrypted display name
  displayNameEncrypted: jsonb("display_name_encrypted"), // { encryptedData, iv, salt }
  bio: text("bio"), // Will store encrypted bio
  bioEncrypted: jsonb("bio_encrypted"), // { encryptedData, iv, salt }
  profileImage: text("profile_image"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(false), // Flag to indicate if profile data is encrypted
});

export const vasks = pgTable("vasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content"), // Will store encrypted content
  contentEncrypted: jsonb("content_encrypted"), // { encryptedData, iv, salt }
  imageUrl: text("image_url"),
  imageHash: text("image_hash"),
  ipfsHash: text("ipfs_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPinned: boolean("is_pinned").default(false),
  isEncrypted: boolean("is_encrypted").default(false), // Flag to indicate if content is encrypted
  mediaUrls: text("media_urls").default("[]"), // JSON array of media URLs
  mediaTypes: text("media_types").default("[]"), // JSON array of media types
  mediaFilenames: text("media_filenames").default("[]"), // JSON array of media filenames
  mediaSizes: text("media_sizes").default("[]"), // JSON array of media sizes
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vaskId: varchar("vask_id").notNull().references(() => vasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vaskId: varchar("vask_id").notNull().references(() => vasks.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(), // Will store encrypted content
  contentEncrypted: jsonb("content_encrypted"), // { encryptedData, iv, salt }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(false), // Flag to indicate if content is encrypted
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  theme: text("theme").default("dark"),
  preferences: jsonb("preferences"),
});

export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(), // Will store encrypted title
  titleEncrypted: jsonb("title_encrypted"), // { encryptedData, iv, salt }
  description: text("description"), // Will store encrypted description
  descriptionEncrypted: jsonb("description_encrypted"), // { encryptedData, iv, salt }
  options: jsonb("options").notNull(), // Array of strings - will store encrypted options
  optionsEncrypted: jsonb("options_encrypted"), // { encryptedData, iv, salt }
  deadline: timestamp("deadline").notNull(),
  correctOption: integer("correct_option"),
  isResolved: boolean("is_resolved").default(false),
  isStakingEnabled: boolean("is_staking_enabled").default(false),
  totalStaked: text("total_staked").default("0"),
  votes: jsonb("votes").default({}), // { [option: number]: number }
  stakes: jsonb("stakes").default({}), // { [option: number]: number }
  userVotes: jsonb("user_votes").default({}), // { [userAddress]: { option, stakeAmount, timestamp } }
  status: text("status").default("active"), // active, closed, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(false), // Flag to indicate if poll data is encrypted
});

export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  option: integer("option").notNull(),
  stakeAmount: text("stake_amount").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  uniqueId: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores"),
});

// Schema for updating username
export const updateUsernameSchema = z.object({
  uniqueId: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores"),
});

export const insertVaskSchema = createInsertSchema(vasks).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().max(280).optional(),
  imageUrl: z.string().url().optional(),
  imageHash: z.string().optional(),
}).refine(
  (data) => data.content || data.imageUrl || data.imageHash,
  {
    message: "Either content, imageUrl, or imageHash must be provided",
    path: ["content"],
  }
);

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().min(1).max(280),
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
export type UpdateUsername = z.infer<typeof updateUsernameSchema>;

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
