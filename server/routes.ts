import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcrypt";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { storage } from "./simple-sqlite-storage";
import { 
  insertUserSchema, 
  insertVaskSchema, 
  insertLikeSchema, 
  insertCommentSchema, 
  insertUserSettingsSchema,
  insertFollowSchema,
  insertPollSchema
} from "@shared/sqlite-schema";
import { 
  authLimiter, 
  adminLimiter, 
  apiLimiter,
  adminIPWhitelist,
  validateAdminSession
} from "./security";

// Extend session type to include adminUser
declare module 'express-session' {
  interface SessionData {
    adminUser?: {
      id: string;
      username: string;
    };
    lastActivity?: number;
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: any): string {
  if (!data || data.length === 0) return '';
  
  if (Array.isArray(data)) {
    const headers = Object.keys(data[0] || {});
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  // For non-array data (like analytics)
  const headers = Object.keys(data);
  const csvHeaders = headers.join(',');
  const csvRow = headers.map(header => {
    const value = data[header];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
    if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }).join(',');
  return [csvHeaders, csvRow].join('\n');
}

// Configure multer for file uploads - will be redefined later with proper storage

// Enhanced admin authentication middleware
const requireAdminAuth = (req: any, res: any, next: any) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`🔒 [${timestamp}] Admin auth attempt from IP: ${ip}`);
  
  if (!req.session) {
    console.log(`❌ [${timestamp}] No session found for IP: ${ip}`);
    return res.status(401).json({ 
      error: "Authentication required",
      message: "Please log in to access admin features"
    });
  }

  if (!req.session.adminUser) {
    console.log(`❌ [${timestamp}] Admin authentication required for IP: ${ip}`);
    return res.status(401).json({ 
      error: "Admin authentication required",
      message: "Please log in with admin credentials"
    });
  }

  // Check session age (2 hours max)
  const sessionAge = Date.now() - (req.session.lastActivity || Date.now());
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  if (sessionAge > maxAge) {
    console.log(`⏰ [${timestamp}] Admin session expired for IP: ${ip}`);
    req.session.destroy((err: any) => {
      if (err) console.error('Session destruction error:', err);
    });
    return res.status(401).json({ 
      error: "Session expired",
      message: "Please log in again"
    });
  }

  // Update last activity
  req.session.lastActivity = Date.now();
  
  console.log(`✅ [${timestamp}] Admin authenticated: ${req.session.adminUser.username} from IP: ${ip}`);
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working", timestamp: new Date().toISOString() });
  });

  // Initialize admin user if not exists
  const existingAdmin = await storage.getAdminUser("admin");
  console.log("🔐 Admin setup - Existing admin:", existingAdmin ? "Found" : "Not found");
  
  if (!existingAdmin) {
    console.log("🔐 Creating admin user with credentials: admin / V@$ukii@dmin2024!Secure#");
    // Use strong credentials for security
    const devUsername = "admin";
    const devPassword = "V@$ukii@dmin2024!Secure#";
    const hashedPassword = await bcrypt.hash(devPassword, 12);
    
    const newAdmin = await storage.createAdminUser({
      username: devUsername,
      passwordHash: hashedPassword
    });
    
    console.log("✅ Admin user created successfully:", newAdmin.username);
    console.log("🔑 Development admin credentials:");
    console.log("   Username:", devUsername);
    console.log("   Password:", devPassword);
    console.log("⚠️  IMPORTANT: This is a development password. Change it for production!");
  } else {
    console.log("✅ Admin user already exists:", existingAdmin.username);
  }

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const upload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/', 'video/', 'audio/', 'application/'];
      const isValidType = allowedTypes.some(type => file.mimetype.startsWith(type));
      if (isValidType) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Admin authentication routes with rate limiting and IP whitelist
  app.post("/api/admin/login", adminIPWhitelist, authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Input validation
      if (!username || !password) {
        return res.status(400).json({ 
          error: "Missing credentials",
          message: "Username and password are required"
        });
      }

      // Basic input sanitization
      if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ 
          error: "Invalid input",
          message: "Username and password must be strings"
        });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ 
          error: "Invalid username",
          message: "Username must be between 3 and 50 characters"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ 
          error: "Invalid password",
          message: "Password must be at least 8 characters long"
        });
      }
      
      console.log("🔐 Admin login attempt for:", username);

      const adminUser = await storage.getAdminUser(username);
      console.log("🔍 Admin user lookup:", adminUser ? "Found" : "Not found");
      
      if (!adminUser) {
        console.log("❌ Admin user not found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
      console.log("🔑 Password verification:", isValidPassword ? "Valid" : "Invalid");
      
      if (!isValidPassword) {
        console.log("❌ Invalid password");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateAdminLastLogin(username);

      // Set session
      req.session.adminUser = {
        id: adminUser.id,
        username: adminUser.username
      };

      console.log("✅ Login successful, session set for:", req.session.adminUser.username);

      res.json({ 
        message: "Login successful",
        adminUser: {
          id: adminUser.id,
          username: adminUser.username,
          lastLogin: adminUser.lastLogin
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", adminLimiter, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/admin/status", adminLimiter, requireAdminAuth, (req, res) => {
    console.log("🔍 Admin status check:", req.session.adminUser);
    res.json({ 
      authenticated: true,
      adminUser: req.session.adminUser
    });
  });

  app.get("/api/admin/users", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = await storage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/admin/vasks", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const vasks = await storage.getAllVasks(limit, offset);
      res.json(vasks);
    } catch (error) {
      console.error("Admin get vasks error:", error);
      res.status(500).json({ message: "Failed to fetch vasks" });
    }
  });

  app.get("/api/admin/polls", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const polls = await storage.getAllPolls();
      res.json(polls);
    } catch (error) {
      console.error("Admin get polls error:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.get("/api/admin/analytics", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Admin get analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // VSK Token Distribution Routes
  app.get("/api/admin/vsk-distribution/stats", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const userAddresses = users.map(user => user.walletAddress);
      
      // Calculate distribution stats
      const stats = {
        totalUsers: users.length,
        eligibleUsers: userAddresses.length,
        totalTokensNeeded: userAddresses.length * 20, // 20 VSK per user
        adminWalletAddress: "0x9D1AF2fbcF4ae543ddc6Ce2B739F4d51906a9075",
        distributionAmount: 20,
        lastDistribution: null, // Will be implemented with database tracking
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Admin get VSK distribution stats error:", error);
      res.status(500).json({ message: "Failed to fetch distribution stats" });
    }
  });

  app.post("/api/admin/vsk-distribution/execute", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { amountPerUser = 20, dryRun = false } = req.body;
      
      if (amountPerUser <= 0 || amountPerUser > 1000) {
        return res.status(400).json({ 
          message: "Amount per user must be between 1 and 1000 VSK" 
        });
      }

      // Get all users
      const users = await storage.getAllUsers();
      const userAddresses = users.map(user => user.walletAddress);
      
      if (userAddresses.length === 0) {
        return res.status(400).json({ message: "No users found for distribution" });
      }

      const totalTokensNeeded = userAddresses.length * amountPerUser;
      
      // For now, we'll simulate the distribution since we're using a demo token system
      // In production, this would interact with the actual blockchain
      const distributionResult = {
        success: true,
        dryRun,
        totalUsers: userAddresses.length,
        amountPerUser,
        totalTokensDistributed: dryRun ? 0 : totalTokensNeeded,
        adminWalletAddress: "0x9D1AF2fbcF4ae543ddc6Ce2B739F4d51906a9075",
        distributionId: `dist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipients: dryRun ? [] : userAddresses.slice(0, 10), // Show first 10 for preview
        message: dryRun 
          ? `Dry run: Would distribute ${amountPerUser} VSK to ${userAddresses.length} users (${totalTokensNeeded} total)`
          : `Successfully distributed ${amountPerUser} VSK to ${userAddresses.length} users (${totalTokensNeeded} total)`
      };

      if (!dryRun) {
        // Log the distribution for tracking
        console.log(`🎁 VSK Distribution executed:`, {
          admin: req.session.adminUser?.username,
          timestamp: distributionResult.timestamp,
          totalUsers: distributionResult.totalUsers,
          amountPerUser: distributionResult.amountPerUser,
          totalTokens: distributionResult.totalTokensDistributed
        });
      }

      res.json(distributionResult);
    } catch (error) {
      console.error("Admin execute VSK distribution error:", error);
      res.status(500).json({ message: "Failed to execute distribution" });
    }
  });

  app.get("/api/admin/vsk-distribution/history", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      // For now, return mock history. In production, this would come from database
      const mockHistory = [
        {
          id: "dist_1",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          adminUser: "admin",
          totalUsers: 5,
          amountPerUser: 20,
          totalTokensDistributed: 100,
          status: "completed"
        },
        {
          id: "dist_2", 
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          adminUser: "admin",
          totalUsers: 3,
          amountPerUser: 50,
          totalTokensDistributed: 150,
          status: "completed"
        }
      ];
      
      res.json(mockHistory);
    } catch (error) {
      console.error("Admin get VSK distribution history error:", error);
      res.status(500).json({ message: "Failed to fetch distribution history" });
    }
  });

  app.get("/api/admin/dashboard", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      // Get dashboard data
      const analytics = await storage.getAnalytics();
      const recentVasks = await storage.getAllVasks(10, 0);
      const recentPolls = await storage.getAllPolls();
      const recentUsers = await storage.getAllUsers(10, 0);
      
      const dashboardData = {
        analytics,
        recentVasks: recentVasks.slice(0, 10),
        recentPolls: recentPolls.slice(0, 10),
        recentUsers: recentUsers.slice(0, 10),
        timestamp: new Date().toISOString()
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Admin get dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.put("/api/admin/users/:id", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { displayName, bio } = req.body;
      
      const updatedUser = await storage.updateUser(id, { displayName, bio } as any);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.delete("/api/admin/vasks/:id", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteVask(id, 'admin');
      if (!deleted) {
        return res.status(404).json({ message: "Vask not found" });
      }
      
      res.json({ message: "Vask deleted successfully" });
    } catch (error) {
      console.error("Admin delete vask error:", error);
      res.status(500).json({ message: "Failed to delete vask" });
    }
  });

  app.delete("/api/admin/polls/:id", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePoll(id, 'admin');
      if (!deleted) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      res.json({ message: "Poll deleted successfully" });
    } catch (error) {
      console.error("Admin delete poll error:", error);
      res.status(500).json({ message: "Failed to delete poll" });
    }
  });

  app.post("/api/admin/bulk-delete/:type", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { type } = req.params;
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid IDs provided" });
      }
      
      let deleted = 0;
      for (const id of ids) {
        if (type === "users") {
          if (await storage.deleteUser(id)) deleted++;
        } else if (type === "vasks") {
          if (await storage.deleteVask(id, 'admin')) deleted++;
        } else if (type === "polls") {
          if (await storage.deletePoll(id, 'admin')) deleted++;
        }
      }
      
      res.json({ message: `${deleted} items deleted successfully` });
    } catch (error) {
      console.error("Admin bulk delete error:", error);
      res.status(500).json({ message: "Failed to perform bulk delete" });
    }
  });

  app.get("/api/admin/export/:type", adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      const { type } = req.params;
      let data = [];
      
      if (type === "users") {
        data = await storage.getAllUsers();
      } else if (type === "vasks") {
        data = await storage.getAllVasks();
      } else if (type === "polls") {
        data = await storage.getAllPolls();
      } else if (type === "all") {
        const users = await storage.getAllUsers();
        const vasks = await storage.getAllVasks();
        const polls = await storage.getAllPolls();
        data = { users, vasks, polls } as any;
      } else {
        return res.status(400).json({ message: "Invalid export type" });
      }
      
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Auth routes
  app.post("/api/auth/wallet", authLimiter, async (req, res) => {
    try {
      const { walletAddress, ensName } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Generate a more user-friendly unique username
        const baseUsername = `user${walletAddress.slice(2, 8).toLowerCase()}`;
        let uniqueId = baseUsername;
        let counter = 1;
        
        // Ensure username is unique
        while (await storage.getUserByUniqueId(uniqueId)) {
          uniqueId = `${baseUsername}${counter}`;
          counter++;
        }
        
        const userData = insertUserSchema.parse({
          uniqueId,
          walletAddress,
          ensName: ensName || null,
          displayName: ensName || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          bio: null,
          profileImage: null,
          coverImage: null
        });
        user = await storage.createUser(userData);
      } else if (ensName && user.ensName !== ensName) {
        user = await storage.updateUser(user.id, { ensName });
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // User suggestion routes (must be before /api/users/:id to avoid route conflict)
  app.get("/api/users/suggestions", async (req, res) => {
    try {
      console.log(`🔍 User suggestions route hit!`);
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      console.log(`🔍 User suggestions request: userId=${userId}, limit=${limit}`);
      
      if (!userId) {
        console.log(`❌ No userId provided`);
        return res.status(400).json({ message: "userId is required" });
      }

      console.log(`🔍 About to call storage.getUser with: ${userId}`);
      // Check if user exists
      const user = await storage.getUser(userId);
      console.log(`🔍 User lookup result: ${user ? 'found' : 'not found'}`);
      if (!user) {
        console.log(`❌ User not found for ID: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      const suggestions = await storage.getUserSuggestions(userId, limit);
      console.log(`✅ Found ${suggestions.length} user suggestions`);
      res.json(suggestions);
    } catch (error) {
      console.error("Get user suggestions error:", error);
      res.status(500).json({ message: "Failed to get user suggestions" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const currentUserId = req.query.currentUserId as string;
      const user = await storage.getUserProfile(req.params.id, currentUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/users/by-unique-id/:uniqueId", async (req, res) => {
    try {
      const currentUserId = req.query.currentUserId as string;
      const user = await storage.getUserByUniqueId(req.params.uniqueId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const profile = await storage.getUserProfile(user.id, currentUserId);
      res.json(profile);
    } catch (error) {
      console.error("Get user by unique ID error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/users/by-wallet/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user by wallet address error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get user encryption keys
  app.get("/api/users/:userId/encryption-keys", async (req, res) => {
    try {
      const { userId } = req.params;
      const keys = await storage.getUserEncryptionKeys(userId);
      
      if (!keys) {
        return res.status(404).json({ message: "Encryption keys not found" });
      }
      
      res.json(keys);
    } catch (error) {
      console.error("Get encryption keys error:", error);
      res.status(500).json({ message: "Failed to get encryption keys" });
    }
  });

  // Generate user encryption keys
  app.post("/api/users/:userId/generate-keys", async (req, res) => {
    try {
      const { userId } = req.params;
      const keys = await storage.generateUserEncryptionKeys(userId);
      
      res.json(keys);
    } catch (error) {
      console.error("Generate encryption keys error:", error);
      res.status(500).json({ message: "Failed to generate encryption keys" });
    }
  });

  // Get user public key
  app.get("/api/users/:userId/public-key", async (req, res) => {
    try {
      const { userId } = req.params;
      const keys = await storage.getUserEncryptionKeys(userId);
      
      if (!keys) {
        return res.status(404).json({ message: "Public key not found" });
      }
      
      res.json({ publicKey: keys.publicKey });
    } catch (error) {
      console.error("Get public key error:", error);
      res.status(500).json({ message: "Failed to get public key" });
    }
  });

  // Username validation endpoint
  app.get("/api/users/check-username/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const currentUserId = req.query.currentUserId as string;
      
      // Check if username is valid format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.json({ 
          available: false, 
          message: "Username must be 3-20 characters long and contain only letters, numbers, and underscores" 
        });
      }
      
      const existingUser = await storage.getUserByUniqueId(username);
      
      if (existingUser && existingUser.id !== currentUserId) {
        return res.json({ available: false, message: "Username is already taken" });
      }
      
      res.json({ available: true, message: "Username is available" });
    } catch (error) {
      console.error("Check username error:", error);
      res.status(500).json({ message: "Failed to check username" });
    }
  });

  app.patch("/api/users/:id", upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
    try {
      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      console.log('🔍 Files received:', files);
      console.log('🔍 Request body:', req.body);
      
      // Allow partial updates for displayName, bio, and uniqueId
      const updates: any = {
        displayName: req.body.displayName || undefined,
        bio: req.body.bio || undefined,
        ensName: req.body.ensName || undefined,
      };
      
      // Handle username change
      if (req.body.uniqueId && req.body.uniqueId !== req.params.id) {
        // Check if new username is available
        const existingUser = await storage.getUserByUniqueId(req.body.uniqueId);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ message: "Username is already taken" });
        }
        updates.uniqueId = req.body.uniqueId;
      }
      
      // Handle profile image upload
      if (files?.profileImage?.[0]) {
        try {
          const profileImageFile = files.profileImage[0];
          console.log('🔍 Profile image file:', {
            fieldname: profileImageFile.fieldname,
            originalname: profileImageFile.originalname,
            mimetype: profileImageFile.mimetype,
            path: profileImageFile.path,
            size: profileImageFile.size
          });
          
          // Read file from disk and convert to data URL
          const fileBuffer = fs.readFileSync(profileImageFile.path);
          const base64 = fileBuffer.toString('base64');
          updates.profileImage = `data:${profileImageFile.mimetype};base64,${base64}`;
          
          // Clean up the temporary file
          fs.unlinkSync(profileImageFile.path);
          console.log('✅ Profile image processed successfully');
        } catch (error) {
          console.error('❌ Error processing profile image:', error);
          // Continue without the profile image
        }
      }
      
      // Handle cover image upload
      if (files?.coverImage?.[0]) {
        try {
          const coverImageFile = files.coverImage[0];
          console.log('🔍 Cover image file:', {
            fieldname: coverImageFile.fieldname,
            originalname: coverImageFile.originalname,
            mimetype: coverImageFile.mimetype,
            path: coverImageFile.path,
            size: coverImageFile.size
          });
          
          // Read file from disk and convert to data URL
          const fileBuffer = fs.readFileSync(coverImageFile.path);
          const base64 = fileBuffer.toString('base64');
          updates.coverImage = `data:${coverImageFile.mimetype};base64,${base64}`;
          
          // Clean up the temporary file
          fs.unlinkSync(coverImageFile.path);
          console.log('✅ Cover image processed successfully');
        } catch (error) {
          console.error('❌ Error processing cover image:', error);
          // Continue without the cover image
        }
      }
      
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Vask routes
  app.get("/api/vasks", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      const vasks = await storage.getVasks(limit, offset, currentUserId);
      res.json(vasks);
    } catch (error) {
      console.error("Get vasks error:", error);
      res.status(500).json({ message: "Failed to get vasks" });
    }
  });

  app.get("/api/vasks/:id", async (req, res) => {
    try {
      const vask = await storage.getVask(req.params.id);
      if (!vask) {
        return res.status(404).json({ message: "Vask not found" });
      }
      res.json(vask);
    } catch (error) {
      console.error("Get vask error:", error);
      res.status(500).json({ message: "Failed to get vask" });
    }
  });

  app.post("/api/vasks", apiLimiter, upload.array('files', 10), async (req, res) => {
    try {
      let vaskData;
      
      // Handle both JSON and FormData
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        // Handle multiple file uploads
        const mediaUrls = files.map(file => `/uploads/${file.filename}`);
        const mediaTypes = files.map(file => 
          file.mimetype.startsWith('image/') ? 'image' : 
          file.mimetype.startsWith('video/') ? 'video' : 'file'
        );
        const mediaFilenames = files.map(file => file.originalname);
        const mediaSizes = files.map(file => file.size);
        
        const { authorId, content, contentEncrypted, isEncrypted } = req.body;
        
        // Check if user exists, create if not
        let userId = authorId;
        if (authorId && authorId.startsWith('0x')) {
          // If authorId is a wallet address, find or create user
          let user = await storage.getUserByWalletAddress(authorId);
          if (!user) {
            console.log('🔍 User not found for wallet address:', authorId);
            user = await storage.createUser({
              walletAddress: authorId,
              displayName: `User ${authorId.slice(0, 6)}...${authorId.slice(-4)}`,
              uniqueId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            console.log('✅ Created new user:', user.id);
          }
          userId = user.id;
        }
        
        vaskData = {
          authorId: userId,
          content: content || null,
          contentEncrypted: contentEncrypted ? JSON.parse(contentEncrypted) : null,
          imageUrl: null,
          imageHash: null,
          ipfsHash: null,
          isPinned: false,
          isEncrypted: isEncrypted === 'true',
          mediaUrls,
          mediaTypes,
          mediaFilenames,
          mediaSizes
        };
      } else {
        // Handle JSON
        const body = req.body;
        
        // Ensure required fields have default values
        if (!body.isPinned) {
          body.isPinned = false;
        }
        if (body.isEncrypted === undefined) {
          body.isEncrypted = false;
        }
        
        // Add empty media arrays for JSON requests
        body.mediaUrls = body.mediaUrls || [];
        body.mediaTypes = body.mediaTypes || [];
        body.mediaFilenames = body.mediaFilenames || [];
        body.mediaSizes = body.mediaSizes || [];
        
        // Check if user exists, create if not
        if (body.authorId && body.authorId.startsWith('0x')) {
          // If authorId is a wallet address, find or create user
          let user = await storage.getUserByWalletAddress(body.authorId);
          if (!user) {
            console.log('🔍 User not found for wallet address:', body.authorId);
            user = await storage.createUser({
              walletAddress: body.authorId,
              displayName: `User ${body.authorId.slice(0, 6)}...${body.authorId.slice(-4)}`,
              uniqueId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            console.log('✅ Created new user:', user.id);
          }
          body.authorId = user.id;
        }
        
        // Validate the data
        try {
          console.log("Validating vask data:", JSON.stringify(body, null, 2));
          vaskData = insertVaskSchema.parse(body);
          console.log("Validation successful:", JSON.stringify(vaskData, null, 2));
        } catch (validationError) {
          console.error("Validation error details:", validationError);
          if (validationError && typeof validationError === 'object' && 'issues' in validationError) {
            console.error("Validation issues:", validationError.issues);
          }
          return res.status(400).json({ 
            message: "Validation failed", 
            error: validationError instanceof Error ? validationError.message : "Invalid data format",
            details: validationError && typeof validationError === 'object' && 'issues' in validationError ? validationError.issues : null
          });
        }
      }
      
      console.log("Creating vask with data:", vaskData);
      
      let vask;
      
      // Check if encryption is enabled
      if (vaskData.isEncrypted && vaskData.content) {
        // Check if user has encryption keys, generate if not
        let userKeys = await storage.getUserEncryptionKeys(vaskData.authorId);
        if (!userKeys) {
          userKeys = await storage.generateUserEncryptionKeys(vaskData.authorId);
        }
        
        // Create encrypted vask
        vask = await storage.createEncryptedVask(
          vaskData.authorId,
          vaskData.content,
          vaskData.imageUrl,
          vaskData.imageHash,
          vaskData.ipfsHash,
          vaskData.mediaUrls,
          vaskData.mediaTypes,
          vaskData.mediaFilenames,
          vaskData.mediaSizes
        );
        
        // Log encryption event
        await storage.logEncryptionEvent(
          vaskData.authorId,
          'VASK_CREATED',
          'VASK',
          vask.id,
          'ENCRYPTED',
          req.ip,
          req.get('User-Agent')
        );
      } else {
        // Create regular vask
        vask = await storage.createVask(vaskData);
        
        // Log encryption event
        await storage.logEncryptionEvent(
          vaskData.authorId,
          'VASK_CREATED',
          'VASK',
          vask.id,
          'UNENCRYPTED',
          req.ip,
          req.get('User-Agent')
        );
      }
      
      res.status(201).json(vask);
    } catch (error) {
      console.error("Create vask error:", error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ message: "File too large. Maximum size is 50MB." });
      } else {
        res.status(500).json({ 
          message: "Failed to create vask", 
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.delete("/api/vasks/:id", apiLimiter, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const success = await storage.deleteVask(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Vask not found or unauthorized" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete vask error:", error);
      res.status(500).json({ message: "Failed to delete vask" });
    }
  });

  app.get("/api/users/:id/vasks", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      const vasks = await storage.getVasksByUser(req.params.id, limit, offset, currentUserId);
      res.json(vasks);
    } catch (error) {
      console.error("Get user vasks error:", error);
      res.status(500).json({ message: "Failed to get user vasks" });
    }
  });

  app.post("/api/vasks/:id/pin", apiLimiter, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const success = await storage.pinVask(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Vask not found or unauthorized" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Pin vask error:", error);
      res.status(500).json({ message: "Failed to pin vask" });
    }
  });

  // Like routes
  app.post("/api/vasks/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if vask exists
      const vask = await storage.getVask(req.params.id);
      if (!vask) {
        return res.status(404).json({ message: "Vask not found" });
      }

      const existingLike = await storage.getLike(req.params.id, userId);
      if (existingLike) {
        return res.status(400).json({ message: "Already liked" });
      }

      const like = await storage.createLike(req.params.id, userId);
      
      // Create notification for vask author
      await storage.createNotification({
        userId: vask.authorId,
        type: 'like',
        actorId: userId,
        vaskId: req.params.id
      });
      
      res.status(201).json(like);
    } catch (error) {
      console.error("Create like error:", error);
      res.status(500).json({ message: "Failed to create like" });
    }
  });

  app.delete("/api/vasks/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      await storage.deleteLike(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete like error:", error);
      res.status(500).json({ message: "Failed to delete like" });
    }
  });

  app.get("/api/users/:id/likes", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const vasks = await storage.getLikedVasks(req.params.id, limit, offset);
      res.json(vasks);
    } catch (error) {
      console.error("Get liked vasks error:", error);
      res.status(500).json({ message: "Failed to get liked vasks" });
    }
  });

  // Reaction routes
  app.post("/api/vasks/:id/react", async (req, res) => {
    try {
      const { userId, emoji, isPremium } = req.body;
      if (!userId || !emoji) {
        return res.status(400).json({ message: "User ID and emoji are required" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if vask exists
      const vask = await storage.getVask(req.params.id);
      if (!vask) {
        return res.status(404).json({ message: "Vask not found" });
      }

      const reaction = await storage.createReaction(req.params.id, userId, emoji, isPremium || false);
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Create reaction error:", error);
      res.status(500).json({ message: "Failed to create reaction" });
    }
  });

  app.delete("/api/vasks/:id/react", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      await storage.deleteReaction(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reaction error:", error);
      res.status(500).json({ message: "Failed to delete reaction" });
    }
  });

  app.get("/api/vasks/:id/reactions", async (req, res) => {
    try {
      const reactions = await storage.getReactions(req.params.id);
      res.json(reactions);
    } catch (error) {
      console.error("Get reactions error:", error);
      res.status(500).json({ message: "Failed to get reactions" });
    }
  });

  // Hashtag routes
  app.get("/api/hashtags/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hashtags = await storage.getTrendingHashtags(limit);
      res.json(hashtags);
    } catch (error) {
      console.error("Get trending hashtags error:", error);
      res.status(500).json({ message: "Failed to get trending hashtags" });
    }
  });

  app.get("/api/vasks/hashtag/:tag", async (req, res) => {
    try {
      const { tag } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      
      const vasks = await storage.getVasksByHashtag(tag, limit, offset, currentUserId);
      res.json(vasks);
    } catch (error) {
      console.error("Get vasks by hashtag error:", error);
      res.status(500).json({ message: "Failed to get vasks by hashtag" });
    }
  });

  // Mention routes
  app.get("/api/mentions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const mentions = await storage.getMentionsForUser(userId, limit, offset);
      res.json(mentions);
    } catch (error) {
      console.error("Get mentions error:", error);
      res.status(500).json({ message: "Failed to get mentions" });
    }
  });

  app.post("/api/mentions/:id/read", async (req, res) => {
    try {
      await storage.markMentionAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark mention as read error:", error);
      res.status(500).json({ message: "Failed to mark mention as read" });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard/reactions", async (req, res) => {
    try {
      const emoji = req.query.emoji as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const leaderboard = await storage.getReactionLeaderboard(emoji, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get reaction leaderboard error:", error);
      res.status(500).json({ message: "Failed to get reaction leaderboard" });
    }
  });

  // Bookmark routes
  app.post("/api/bookmarks/:vaskId", async (req, res) => {
    try {
      const { userId } = req.body;
      const { vaskId } = req.params;
      
      await storage.createBookmark(userId, vaskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Create bookmark error:", error);
      res.status(500).json({ message: "Failed to create bookmark" });
    }
  });

  app.delete("/api/bookmarks/:vaskId", async (req, res) => {
    try {
      const { userId } = req.body;
      const { vaskId } = req.params;
      
      await storage.deleteBookmark(userId, vaskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete bookmark error:", error);
      res.status(500).json({ message: "Failed to delete bookmark" });
    }
  });

  app.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const bookmarks = await storage.getBookmarksForUser(userId, limit, offset);
      res.json(bookmarks);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      res.status(500).json({ message: "Failed to get bookmarks" });
    }
  });

  app.get("/api/bookmarks/:vaskId/status", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const { vaskId } = req.params;
      
      const isBookmarked = await storage.isBookmarked(userId, vaskId);
      res.json({ isBookmarked });
    } catch (error) {
      console.error("Check bookmark status error:", error);
      res.status(500).json({ message: "Failed to check bookmark status" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const notifications = await storage.getNotificationsForUser(userId, limit, offset);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread notification count error:", error);
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  // Comment routes
  app.get("/api/vasks/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/vasks/:id/comments", async (req, res) => {
    try {
      const { content, contentEncrypted, authorId, isEncrypted } = req.body;
      
      let comment;
      
      if (isEncrypted && content) {
        // Check if user has encryption keys, generate if not
        let userKeys = await storage.getUserEncryptionKeys(authorId);
        if (!userKeys) {
          userKeys = await storage.generateUserEncryptionKeys(authorId);
        }
        
        // Create encrypted comment
        comment = await storage.createEncryptedComment(req.params.id, authorId, content);
        
        // Log encryption event
        await storage.logEncryptionEvent(
          authorId,
          'COMMENT_CREATED',
          'COMMENT',
          comment.id,
          'ENCRYPTED',
          req.ip,
          req.get('User-Agent')
        );
      } else {
        // Create regular comment
        const commentData = {
          vaskId: req.params.id,
          authorId,
          content: content || '',
          contentEncrypted: contentEncrypted || null,
          isEncrypted: isEncrypted || false
        };
        
        comment = await storage.createComment(commentData);
        
        // Log encryption event
        await storage.logEncryptionEvent(
          authorId,
          'COMMENT_CREATED',
          'COMMENT',
          comment.id,
          'UNENCRYPTED',
          req.ip,
          req.get('User-Agent')
        );
      }
      
      // Get vask to find author
      const vask = await storage.getVask(req.params.id);
      if (vask) {
        // Create notification for vask author
        await storage.createNotification({
          userId: vask.authorId,
          type: 'comment',
          actorId: authorId,
          vaskId: req.params.id,
          commentId: comment.id
        });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const success = await storage.deleteComment(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found or unauthorized" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Settings routes
  app.get("/api/users/:id/settings", async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.params.id);
      res.json(settings || { theme: "dark", preferences: {} });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.patch("/api/users/:id/settings", async (req, res) => {
    try {
      const settingsData = insertUserSettingsSchema.parse({
        ...req.body,
        userId: req.params.id
      });
      const settings = await storage.updateUserSettings(req.params.id, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Follow routes
  app.post("/api/users/:id/follow", async (req, res) => {
    try {
      console.log('🔍 Follow request received:', {
        userId: req.params.id,
        body: req.body,
        followerId: req.body?.followerId
      });
      
      const { followerId } = req.body;
      if (!followerId) {
        console.log('❌ Missing followerId in request body');
        return res.status(400).json({ message: "Follower ID is required" });
      }

      if (followerId === req.params.id) {
        console.log('❌ Cannot follow yourself:', { followerId, targetUserId: req.params.id });
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      console.log('🔍 Checking existing follow relationship:', { followerId, followingId: req.params.id });
      const existingFollow = await storage.getFollow(followerId, req.params.id);
      if (existingFollow) {
        console.log('❌ Already following this user:', existingFollow);
        return res.status(400).json({ message: "Already following this user" });
      }

      console.log('✅ Creating follow relationship:', { followerId, followingId: req.params.id });
      await storage.followUser(followerId, req.params.id);
      console.log('✅ Follow relationship created successfully');
      
      // Create notification for followed user
      await storage.createNotification({
        userId: req.params.id,
        type: 'follow',
        actorId: followerId
      });
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Follow user error:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:id/follow", async (req, res) => {
    try {
      console.log('🔍 Unfollow request received:', {
        userId: req.params.id,
        body: req.body,
        followerId: req.body?.followerId
      });
      
      const { followerId } = req.body;
      if (!followerId) {
        console.log('❌ Missing followerId in request body');
        return res.status(400).json({ message: "Follower ID is required" });
      }

      // Check if the follow relationship exists
      console.log('🔍 Checking existing follow relationship for unfollow:', { followerId, followingId: req.params.id });
      const existingFollow = await storage.getFollow(followerId, req.params.id);
      if (!existingFollow) {
        console.log('❌ Not following this user:', { followerId, followingId: req.params.id });
        return res.status(400).json({ message: "Not following this user" });
      }

      console.log('✅ Removing follow relationship:', { followerId, followingId: req.params.id });
      await storage.unfollowUser(followerId, req.params.id);
      console.log('✅ Follow relationship removed successfully');
      res.json({ success: true });
    } catch (error) {
      console.error("Unfollow user error:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const followers = await storage.getFollowers(req.params.id, limit, offset);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const following = await storage.getFollowing(req.params.id, limit, offset);
      res.json(following);
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  // Search routes
  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      
      console.log('🔍 Search users request:', { query, limit, offset, currentUserId });
      
      if (!query || query.trim().length < 2) {
        console.log('❌ Invalid query:', query);
        return res.json([]);
      }

      let users;
      if (query === 'trending') {
        // Special case for trending users - get users with most followers/vasks
        users = await storage.getTrendingUsers(limit, currentUserId);
        console.log('✅ Trending users result:', users.length, 'users found');
      } else {
        users = await storage.searchUsers(query, limit, offset, currentUserId);
        console.log('✅ Search users result:', users.length, 'users found');
      }
      
      // Debug: Log follow status for first few users
      if (users.length > 0) {
        console.log('🔍 Users follow status sample:', users.slice(0, 3).map(user => ({
          id: user.id,
          displayName: user.displayName,
          isFollowing: user.isFollowing,
          currentUserId
        })));
      }
      
      res.json(users);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });


  // Username management routes
  app.get("/api/username/check/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const currentUserId = req.query.currentUserId as string;
      
      if (!username || username.trim().length < 3) {
        return res.status(400).json({ 
          available: false,
          message: "Username must be at least 3 characters long" 
        });
      }

      const isAvailable = await storage.isUsernameAvailable(username, currentUserId);
      res.json({ 
        available: isAvailable,
        message: isAvailable ? "Username is available" : "Username is already taken"
      });
    } catch (error) {
      console.error("Check username error:", error);
      res.status(500).json({ 
        available: false,
        message: "Failed to check username availability" 
      });
    }
  });

  app.put("/api/users/:id/username", async (req, res) => {
    try {
      const { id } = req.params;
      const { uniqueId: newUsername } = req.body;
      const currentUserId = req.query.currentUserId as string;
      
      if (!newUsername || newUsername.trim().length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      }

      // Check if the user is updating their own username
      if (currentUserId && currentUserId !== id) {
        return res.status(403).json({ message: "You can only update your own username" });
      }

      const updatedUser = await storage.updateUsername(id, newUsername);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Update username error:", error);
      if (error instanceof Error && error.message === "Username is already taken") {
        return res.status(409).json({ message: "Username is already taken" });
      }
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // Direct username lookup route
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const currentUserId = req.query.currentUserId as string;
      
      if (!username || username.trim().length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      }

      const user = await storage.getUserByUniqueId(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user profile with follow status
      const profile = await storage.getUserProfile(user.id, currentUserId);
      res.json(profile);
    } catch (error) {
      console.error("Get user by username error:", error);
      res.status(500).json({ message: "Failed to get user by username" });
    }
  });

  // Poll routes - PUBLIC API (like vasks)
  app.get("/api/polls", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      const walletAddress = req.query.walletAddress as string;
      
      console.log('🔍 API /api/polls called with:', { limit, offset, currentUserId, walletAddress });
      
      // If we have walletAddress but no currentUserId, try to find the user
      let userId = currentUserId;
      if (!userId && walletAddress) {
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (user) {
          userId = user.id;
          console.log('🔍 Found user by wallet address:', userId);
        }
      }
      
      const polls = await storage.getPolls(limit, offset, userId);
      console.log('🔍 Returning polls:', polls.length);
      res.json(polls);
    } catch (error) {
      console.error("Get polls error:", error);
      res.status(500).json({ message: "Failed to get polls", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/polls/:id", async (req, res) => {
    try {
      const currentUserId = req.query.currentUserId as string;
      const walletAddress = req.query.walletAddress as string;
      
      // If we have walletAddress but no currentUserId, try to find the user
      let userId = currentUserId;
      if (!userId && walletAddress) {
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (user) {
          userId = user.id;
        }
      }
      
      const poll = await storage.getPoll(req.params.id, userId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      res.json(poll);
    } catch (error) {
      console.error("Get poll error:", error);
      res.status(500).json({ message: "Failed to get poll", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/polls", async (req, res) => {
    try {
      const pollData = req.body;
      
      // Validate poll data
      const validatedData = insertPollSchema.parse({
        ...pollData,
        deadline: new Date(pollData.deadline),
      });

      // Ensure the creator exists
      const creator = await storage.getUser(validatedData.creatorId);
      if (!creator) {
        return res.status(400).json({ message: "Creator user not found. Please ensure you are properly authenticated." });
      }

      const poll = await storage.createPoll(validatedData);
      res.status(201).json(poll);
    } catch (error) {
      console.error("Create poll error:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid poll data", details: String(error) });
      }
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    try {
      const { userId, option } = req.body;
      
      console.log(`🗳️ Vote request: pollId=${req.params.id}, userId=${userId}, option=${option}`);
      
      if (!userId || option === undefined) {
        console.log(`❌ Vote request failed: Missing required fields - userId: ${userId}, option: ${option}`);
        return res.status(400).json({ message: "userId and option are required" });
      }

      const success = await storage.voteOnPoll(req.params.id, userId, option);
      if (!success) {
        console.log(`❌ Vote request failed: storage.voteOnPoll returned false for poll ${req.params.id}`);
        return res.status(400).json({ message: "Failed to vote on poll" });
      }

      console.log(`✅ Vote request successful for poll ${req.params.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Vote on poll error:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  app.post("/api/polls/:id/resolve", async (req, res) => {
    try {
      const { userId, walletAddress, correctOption } = req.body;
      
      console.log(`🔍 Resolve poll request: pollId=${req.params.id}, userId=${userId}, walletAddress=${walletAddress}, correctOption=${correctOption}`);
      
      if (correctOption === undefined) {
        console.log(`❌ Resolve request failed: correctOption is required`);
        return res.status(400).json({ message: "correctOption is required" });
      }

      let resolvedUserId = userId;
      
      // If userId is not provided, try to get it from walletAddress
      if (!resolvedUserId && walletAddress) {
        console.log(`🔍 Looking up user by wallet address: ${walletAddress}`);
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (!user) {
          console.log(`❌ User not found for wallet address: ${walletAddress}`);
          return res.status(404).json({ message: "User not found for wallet address" });
        }
        resolvedUserId = user.id;
        console.log(`✅ Found user: ${user.id} for wallet: ${walletAddress}`);
      }
      
      if (!resolvedUserId) {
        console.log(`❌ Resolve request failed: No user ID found`);
        return res.status(400).json({ message: "userId or walletAddress is required" });
      }

      console.log(`🔍 Attempting to resolve poll ${req.params.id} with userId ${resolvedUserId} and correctOption ${correctOption}`);
      
      try {
        const success = await storage.resolvePoll(req.params.id, correctOption, resolvedUserId);
        if (!success) {
          console.log(`❌ Failed to resolve poll ${req.params.id}`);
          return res.status(400).json({ message: "Failed to resolve poll" });
        }
      } catch (error) {
        console.log(`❌ Poll resolution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return res.status(403).json({ 
          message: error instanceof Error ? error.message : "Failed to resolve poll",
          error: "CREATOR_ONLY_ACTION"
        });
      }

      console.log(`✅ Poll ${req.params.id} resolved successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error("Resolve poll error:", error);
      res.status(500).json({ message: "Failed to resolve poll" });
    }
  });

  // Close poll endpoint (creator-only)
  app.post("/api/polls/:id/close", async (req, res) => {
    try {
      const { userId, walletAddress } = req.body;
      
      console.log(`🔍 Close poll request: pollId=${req.params.id}, userId=${userId}, walletAddress=${walletAddress}`);
      
      let closedUserId = userId;
      
      // If userId is not provided, try to get it from walletAddress
      if (!closedUserId && walletAddress) {
        console.log(`🔍 Looking up user by wallet address: ${walletAddress}`);
        const user = await storage.getUserByWalletAddress(walletAddress);
        if (!user) {
          console.log(`❌ User not found for wallet address: ${walletAddress}`);
          return res.status(404).json({ message: "User not found for wallet address" });
        }
        closedUserId = user.id;
        console.log(`✅ Found user: ${user.id} for wallet: ${walletAddress}`);
      }
      
      if (!closedUserId) {
        console.log(`❌ Close request failed: No user ID found`);
        return res.status(400).json({ message: "userId or walletAddress is required" });
      }

      console.log(`🔍 Attempting to close poll ${req.params.id} with userId ${closedUserId}`);
      
      try {
        const success = await storage.closePoll(req.params.id, closedUserId);
        if (!success) {
          console.log(`❌ Failed to close poll ${req.params.id}`);
          return res.status(400).json({ message: "Failed to close poll" });
        }
      } catch (error) {
        console.log(`❌ Poll close error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return res.status(403).json({ 
          message: error instanceof Error ? error.message : "Failed to close poll",
          error: "CREATOR_ONLY_ACTION"
        });
      }

      console.log(`✅ Poll ${req.params.id} closed successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error("Close poll error:", error);
      res.status(500).json({ message: "Failed to close poll" });
    }
  });

  app.get("/api/polls/:id/has-voted", async (req, res) => {
    try {
      const userAddress = req.query.userAddress as string;
      if (!userAddress) {
        return res.status(400).json({ message: "userAddress is required" });
      }

      const hasVoted = await storage.hasUserVoted(req.params.id, userAddress);
      res.json({ hasVoted });
    } catch (error) {
      console.error("Check user vote error:", error);
      res.status(500).json({ message: "Failed to check user vote" });
    }
  });

  app.get("/api/polls/:id/user-vote", async (req, res) => {
    try {
      const userAddress = req.query.userAddress as string;
      if (!userAddress) {
        return res.status(400).json({ message: "userAddress is required" });
      }

      const userVote = await storage.getUserVote(req.params.id, userAddress);
      res.json({ userVote });
    } catch (error) {
      console.error("Get user vote error:", error);
      res.status(500).json({ message: "Failed to get user vote" });
    }
  });

  // Clear admin users endpoint (development only)
  app.post("/api/admin/clear-admin-users", adminIPWhitelist, async (req, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Clear admin users only available in development" });
      }
      
      await storage.clearAdminUsers();
      
      res.json({ 
        message: "Admin users cleared successfully"
      });
    } catch (error) {
      console.error("Clear admin users error:", error);
      res.status(500).json({ message: "Failed to clear admin users" });
    }
  });

  // Admin password reset endpoint (development only)
  app.post("/api/admin/reset-password", adminIPWhitelist, async (req, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Password reset only available in development" });
      }
      
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const adminUser = await storage.getAdminUser("admin");
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateAdminPassword("admin", hashedPassword);
      
      res.json({ 
        message: "Admin password updated successfully",
        username: "admin",
        newPassword: newPassword
      });
    } catch (error) {
      console.error("Reset admin password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin routes for data cleanup
  app.post("/api/admin/clear-all", adminIPWhitelist, adminLimiter, requireAdminAuth, async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ message: "All data cleared successfully" });
    } catch (error) {
      console.error("Clear all data error:", error);
      res.status(500).json({ message: "Failed to clear data" });
    }
  });

  // Chat Rooms API - Test endpoint
  app.get("/api/chat-rooms/test", async (req, res) => {
    try {
      res.json({ message: "Chat rooms API is working", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Test failed" });
    }
  });

  app.get("/api/chat-rooms", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.query.currentUserId as string;
      const search = req.query.search as string;
      const type = req.query.type as string;
      
      console.log('🔍 API /api/chat-rooms called with:', { limit, offset, currentUserId, search, type });
      
      const chatRooms = await storage.getChatRooms(limit, offset, currentUserId, search, type);
      console.log('🔍 Returning chat rooms:', chatRooms.length);
      res.json(chatRooms);
    } catch (error) {
      console.error("Get chat rooms error:", error);
      res.status(500).json({ message: "Failed to get chat rooms", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/chat-rooms", async (req, res) => {
    try {
      const { name, type, description, creatorId, firstMessage, password } = req.body;
      
      console.log('🔍 API /api/chat-rooms POST called with:', { name, type, description, creatorId, firstMessage: firstMessage?.substring(0, 50) + "..." });
      
      // Validate required fields
      if (!name || !type || !creatorId || !firstMessage) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          message: "Missing required fields", 
          required: ['name', 'type', 'creatorId', 'firstMessage'] 
        });
      }
      
      // Validate type
      if (!['public', 'private'].includes(type)) {
        console.log('❌ Invalid room type:', type);
        return res.status(400).json({ 
          message: "Invalid room type. Must be 'public' or 'private'" 
        });
      }
      
      // If creatorId is a wallet address, find the user
      let userId = creatorId;
      if (creatorId && creatorId.startsWith('0x')) {
        console.log('🔍 Looking up user by wallet address:', creatorId);
        const user = await storage.getUserByWalletAddress(creatorId);
        console.log('🔍 User lookup result:', user ? 'found' : 'not found');
        if (!user) {
          console.log('❌ User not found for wallet address:', creatorId);
          // Try to create the user first
          console.log('🔍 Attempting to create user for wallet address:', creatorId);
          try {
            const newUser = await storage.createUser({
              uniqueId: `user_${Date.now()}`,
              walletAddress: creatorId,
              displayName: `User ${creatorId.slice(0, 6)}...${creatorId.slice(-4)}`,
              ensName: null,
              bio: null,
              profileImage: null,
              coverImage: null,
              isEncrypted: false
            });
            console.log('✅ User created:', newUser.id);
            userId = newUser.id;
          } catch (userError) {
            console.error('❌ Failed to create user:', userError);
            return res.status(500).json({ 
              message: "Failed to create user", 
              error: userError instanceof Error ? userError.message : String(userError) 
            });
          }
        } else {
          userId = user.id;
          console.log('🔍 Found user by wallet address:', userId);
        }
      }
      
      console.log('🔍 Creating chat room with userId:', userId);
      try {
        const chatRoom = await storage.createChatRoom(name, type, description, userId, firstMessage, password);
        console.log('✅ Chat room created:', chatRoom.id);
        
        res.status(200).json({
          success: true,
          message: "Chat room created successfully",
          id: chatRoom.id,
          name: chatRoom.name,
          type: chatRoom.type,
          description: chatRoom.description,
          creatorId: chatRoom.creatorId,
          createdAt: chatRoom.createdAt
        });
      } catch (roomError) {
        console.error('❌ Failed to create chat room:', roomError);
        return res.status(500).json({ 
          message: "Failed to create chat room", 
          error: roomError instanceof Error ? roomError.message : String(roomError) 
        });
      }
    } catch (error) {
      console.error("Create chat room error:", error);
      console.error("Error details:", error);
      res.status(500).json({ 
        message: "Failed to create chat room", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/chat-rooms/:roomId/join", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;
      
      console.log('🔍 API /api/chat-rooms/:roomId/join called with:', { roomId, userId });
      
      // If userId is a wallet address, find the user
      let actualUserId = userId;
      if (userId && userId.startsWith('0x')) {
        const user = await storage.getUserByWalletAddress(userId);
        if (!user) {
          return res.status(400).json({ message: "User not found for wallet address" });
        }
        actualUserId = user.id;
        console.log('🔍 Found user by wallet address:', actualUserId);
      }
      
      const result = await storage.joinChatRoom(roomId, actualUserId);
      console.log('✅ User joined chat room:', result);
      res.json(result);
    } catch (error) {
      console.error("Join chat room error:", error);
      res.status(500).json({ message: "Failed to join chat room", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/chat-rooms/:roomId/leave", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;
      
      console.log('🔍 API /api/chat-rooms/:roomId/leave called with:', { roomId, userId });
      
      // If userId is a wallet address, find the user
      let actualUserId = userId;
      if (userId && userId.startsWith('0x')) {
        const user = await storage.getUserByWalletAddress(userId);
        if (!user) {
          return res.status(400).json({ message: "User not found for wallet address" });
        }
        actualUserId = user.id;
        console.log('🔍 Found user by wallet address:', actualUserId);
      }
      
      const result = await storage.leaveChatRoom(roomId, actualUserId);
      console.log('✅ User left chat room:', result);
      res.json(result);
    } catch (error) {
      console.error("Leave chat room error:", error);
      res.status(500).json({ message: "Failed to leave chat room", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get specific chat room
  app.get("/api/chat-rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const chatRoom = await storage.getChatRoom(roomId);
      
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }

      // Get creator info
      const creator = await storage.getUser(chatRoom.creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }

      // Parse participants to get count
      const participants = JSON.parse(chatRoom.participants || '[]');
      
      res.json({
        id: chatRoom.id,
        name: chatRoom.name,
        type: chatRoom.type,
        description: chatRoom.description,
        creator: {
          id: creator.id,
          name: creator.displayName || 'Unknown',
          address: creator.walletAddress,
        },
        participants: participants.length,
        maxParticipants: chatRoom.maxParticipants,
        isJoined: false, // This would need to be determined based on current user
        createdAt: chatRoom.createdAt,
        lastActivity: chatRoom.lastActivity,
      });
    } catch (error) {
      console.error("Get chat room error:", error);
      res.status(500).json({ message: "Failed to get chat room", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get chat room messages (with encryption support)
  app.get("/api/chat-rooms/:roomId/messages", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { currentUserId, useEncryption = true } = req.query;
      
      let messages;
      
      if (useEncryption === 'true') {
        // Get encrypted messages
        messages = await storage.getEncryptedChatMessages(roomId, currentUserId as string);
      } else {
        // Get regular messages
        messages = await storage.getChatMessages(roomId);
        
        // Add isOwn flag to each message
        messages = messages.map(message => ({
          ...message,
          isOwn: message.senderId === currentUserId
        }));
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Get chat messages error:", error);
      res.status(500).json({ message: "Failed to get messages", error: error instanceof Error ? error.message : String(error) });
    }
  });

// Send message to chat room (with encryption)
app.post("/api/chat-rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, senderId, messageType = 'text', useEncryption = true } = req.body;
    
    if (!content || !senderId) {
      return res.status(400).json({ message: "Content and senderId are required" });
    }

    let message;
    
    if (useEncryption) {
      // Check if user has encryption keys, generate if not
      let userKeys = await storage.getUserEncryptionKeys(senderId);
      if (!userKeys) {
        userKeys = await storage.generateUserEncryptionKeys(senderId);
      }
      
      // Create encrypted message
      message = await storage.createEncryptedChatMessage(roomId, content, senderId, messageType);
      
      // Log encryption event
      await storage.logEncryptionEvent(
        senderId,
        'MESSAGE_SENT',
        'CHAT_MESSAGE',
        message.id,
        'ENCRYPTED',
        req.ip,
        req.get('User-Agent')
      );
    } else {
      // Create regular message
      message = await storage.createChatMessage(roomId, content, senderId, messageType);
      
      // Log encryption event
      await storage.logEncryptionEvent(
        senderId,
        'MESSAGE_SENT',
        'CHAT_MESSAGE',
        message.id,
        'UNENCRYPTED',
        req.ip,
        req.get('User-Agent')
      );
    }
    
    res.json({
      ...message,
      isOwn: true,
      isEncrypted: useEncryption,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message", error: error instanceof Error ? error.message : String(error) });
  }
});

// Upload file to chat room
app.post("/api/chat-rooms/:roomId/upload", upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId } = req.body;
    
    if (!req.file || !senderId) {
      return res.status(400).json({ message: "File and senderId are required" });
    }

    const file = req.file;
    const messageType = file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'file';
    
    const message = await storage.createChatMessage(
      roomId, 
      '', // No text content for media messages
      senderId, 
      messageType,
      `/uploads/${file.filename}`,
      file.originalname,
      file.size
    );
    
    res.json({
      ...message,
      isOwn: true,
    });
  } catch (error) {
    console.error("Upload file error:", error);
    res.status(500).json({ message: "Failed to upload file", error: error instanceof Error ? error.message : String(error) });
  }
});

// Upload media to vask
app.post("/api/vasks/upload-media", upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { authorId } = req.body;
    
    if (!files || files.length === 0 || !authorId) {
      return res.status(400).json({ message: "Files and authorId are required" });
    }

    const mediaUrls = files.map(file => `/uploads/${file.filename}`);
    const mediaTypes = files.map(file => 
      file.mimetype.startsWith('image/') ? 'image' : 
      file.mimetype.startsWith('video/') ? 'video' : 'file'
    );
    const mediaFilenames = files.map(file => file.originalname);
    const mediaSizes = files.map(file => file.size);
    
    res.json({
      success: true,
      mediaUrls,
      mediaTypes,
      mediaFilenames,
      mediaSizes,
      message: `${files.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({ message: "Failed to upload media", error: error instanceof Error ? error.message : String(error) });
  }
});




      // Admin endpoint to delete chat room
      app.delete("/api/admin/chat-rooms/:id", requireAdminAuth, async (req, res) => {
        try {
          const { id } = req.params;
          console.log(`🗑️ Admin attempting to delete chat room: ${id}`);
          
          // Check if chat room exists
          const room = await storage.getChatRoom(id);
          if (!room) {
            console.log(`❌ Chat room not found: ${id}`);
            return res.status(404).json({ message: "Chat room not found" });
          }
          
          console.log(`✅ Chat room found, proceeding with deletion: ${id}`);
          
          // Delete the chat room
          const success = await storage.deleteChatRoom(id);
          
          if (success) {
            console.log(`✅ Chat room deleted successfully: ${id}`);
            res.json({ message: "Chat room deleted successfully" });
          } else {
            console.log(`❌ Failed to delete chat room: ${id}`);
            res.status(500).json({ message: "Failed to delete chat room" });
          }
        } catch (error) {
          console.error("Delete chat room error:", error);
          res.status(500).json({ message: "Failed to delete chat room", error: error instanceof Error ? error.message : String(error) });
        }
      });

  // Chat room invitation endpoints
  app.post("/api/chat-rooms/:roomId/invite", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { inviterId, inviteeId } = req.body;
      
      if (!inviterId || !inviteeId) {
        return res.status(400).json({ message: "Inviter ID and invitee ID are required" });
      }
      
      const invitation = await storage.createChatInvitation(roomId, inviterId, inviteeId);
      res.json(invitation);
    } catch (error) {
      console.error("Create invitation error:", error);
      res.status(500).json({ message: "Failed to create invitation", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/chat-invitations/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const invitations = await storage.getChatInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({ message: "Failed to get invitations", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/chat-invitations/:token/respond", async (req, res) => {
    try {
      const { token } = req.params;
      const { userId, response } = req.body;
      
      if (!userId || !response || !['accepted', 'declined'].includes(response)) {
        return res.status(400).json({ message: "User ID and valid response are required" });
      }
      
      const success = await storage.respondToInvitation(token, userId, response);
      
      if (success) {
        res.json({ success: true, message: `Invitation ${response} successfully` });
      } else {
        res.status(400).json({ message: "Invalid or expired invitation" });
      }
    } catch (error) {
      console.error("Respond to invitation error:", error);
      res.status(500).json({ message: "Failed to respond to invitation", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Chat room password verification
  app.post("/api/chat-rooms/:roomId/verify-password", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { password, userId } = req.body;
      
      if (!password || !userId) {
        return res.status(400).json({ message: "Password and user ID are required" });
      }
      
      const isValid = await storage.verifyChatRoomPassword(roomId, password);
      
      if (isValid) {
        await storage.grantPasswordAccess(roomId, userId);
        res.json({ success: true, message: "Password verified successfully" });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      console.error("Verify password error:", error);
      res.status(500).json({ message: "Failed to verify password", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Check chat room access
  app.get("/api/chat-rooms/:roomId/access/:userId", async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const hasAccess = await storage.verifyChatRoomAccess(roomId, userId);
      res.json({ hasAccess });
    } catch (error) {
      console.error("Check access error:", error);
      res.status(500).json({ message: "Failed to check access", error: error instanceof Error ? error.message : String(error) });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
