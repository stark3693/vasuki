#!/usr/bin/env tsx

/**
 * Initialize SQLite database with encryption support
 * This script creates the database file and all necessary tables
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';

// Create database file
const sqlite = new Database('./database.sqlite');
const db = drizzle(sqlite);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

async function initializeSQLite() {
  console.log('🗄️ Initializing SQLite database...');

  try {
    // Create tables manually since we don't have migrations yet
    console.log('📝 Creating database tables...');

    // Users table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        unique_id VARCHAR UNIQUE NOT NULL,
        wallet_address TEXT UNIQUE NOT NULL,
        ens_name TEXT,
        display_name TEXT,
        display_name_encrypted TEXT,
        bio TEXT,
        bio_encrypted TEXT,
        profile_image TEXT,
        cover_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_encrypted BOOLEAN DEFAULT FALSE
      )
    `);

    // Vasks table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS vasks (
        id VARCHAR PRIMARY KEY,
        author_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT,
        content_encrypted TEXT,
        image_url TEXT,
        image_hash TEXT,
        ipfs_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_encrypted BOOLEAN DEFAULT FALSE
      )
    `);

    // Comments table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR PRIMARY KEY,
        vask_id VARCHAR NOT NULL REFERENCES vasks(id),
        author_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        content_encrypted TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_encrypted BOOLEAN DEFAULT FALSE
      )
    `);

    // Likes table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id VARCHAR PRIMARY KEY,
        vask_id VARCHAR NOT NULL REFERENCES vasks(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vask_id, user_id)
      )
    `);

    // User settings table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        theme TEXT DEFAULT 'dark',
        preferences TEXT,
        UNIQUE(user_id)
      )
    `);

    // Polls table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS polls (
        id VARCHAR PRIMARY KEY,
        creator_id VARCHAR NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        title_encrypted TEXT,
        description TEXT,
        description_encrypted TEXT,
        options TEXT NOT NULL,
        options_encrypted TEXT,
        deadline TIMESTAMP NOT NULL,
        correct_option INTEGER,
        is_resolved BOOLEAN DEFAULT FALSE,
        is_staking_enabled BOOLEAN DEFAULT FALSE,
        total_staked TEXT DEFAULT '0',
        votes TEXT DEFAULT '{}',
        stakes TEXT DEFAULT '{}',
        user_votes TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_encrypted BOOLEAN DEFAULT FALSE
      )
    `);

    // Poll votes table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id VARCHAR PRIMARY KEY,
        poll_id VARCHAR NOT NULL REFERENCES polls(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        option INTEGER NOT NULL,
        stake_amount TEXT DEFAULT '0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(poll_id, user_id)
      )
    `);

    // Follows table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS follows (
        id VARCHAR PRIMARY KEY,
        follower_id VARCHAR NOT NULL REFERENCES users(id),
        following_id VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      )
    `);

    // Admin users table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    sqlite.exec(`
      INSERT OR IGNORE INTO admin_users (id, username, password_hash)
      VALUES ('admin-001', 'admin', '${hashedPassword}')
    `);

    console.log('✅ Default admin user created');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Change this password in production!');

    console.log('🎉 SQLite database initialized successfully!');
    console.log('');
    console.log('📋 Database Info:');
    console.log('- File: ./database.sqlite');
    console.log('- All tables created with encryption support');
    console.log('- Default admin user created');
    console.log('- Ready for end-to-end encryption!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

// Run initialization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeSQLite()
    .then(() => {
      console.log('✅ Initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
}

export { initializeSQLite };
