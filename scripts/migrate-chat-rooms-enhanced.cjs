#!/usr/bin/env node

/**
 * Migration script to add password and invitation support to chat rooms
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

console.log('🔄 Migrating chat_rooms table for password and invitation support...');

// Connect to the database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

try {
  // Check if the table exists
  const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_rooms'").get();
  
  if (!tableExists) {
    console.log('📋 Creating chat_rooms table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('public', 'private')),
        description TEXT,
        creator_id VARCHAR NOT NULL REFERENCES users(id),
        participants TEXT DEFAULT '[]',
        max_participants INTEGER DEFAULT 50,
        first_message TEXT,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
  } else {
    console.log('📋 Adding enhanced columns to chat_rooms table...');
    
    // Add password_hash column if it doesn't exist
    try {
      sqlite.exec(`ALTER TABLE chat_rooms ADD COLUMN password_hash TEXT`);
      console.log('✅ Added password_hash column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✅ password_hash column already exists');
      } else {
        throw error;
      }
    }
  }

  // Create chat_invitations table
  console.log('📋 Creating chat_invitations table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_invitations (
      id VARCHAR PRIMARY KEY,
      room_id VARCHAR NOT NULL REFERENCES chat_rooms(id),
      inviter_id VARCHAR NOT NULL REFERENCES users(id),
      invitee_id VARCHAR NOT NULL REFERENCES users(id),
      status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
      invitation_token VARCHAR UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP,
      UNIQUE(room_id, invitee_id)
    )
  `);

  // Create chat_room_access table for tracking who has access
  console.log('📋 Creating chat_room_access table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_room_access (
      id VARCHAR PRIMARY KEY,
      room_id VARCHAR NOT NULL REFERENCES chat_rooms(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      access_type VARCHAR DEFAULT 'invited' CHECK (access_type IN ('creator', 'invited', 'password_joined')),
      granted_by VARCHAR REFERENCES users(id),
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, user_id)
    )
  `);

  console.log('✅ Database migration completed successfully!');
  console.log('');
  console.log('📋 New Features Added:');
  console.log('- Password protection for private chat rooms');
  console.log('- Invitation system for private rooms');
  console.log('- Access tracking for room members');
  console.log('- Invitation tokens with expiration');
  console.log('- Status tracking for invitations');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

console.log('🎉 Chat rooms enhanced with password and invitation support!');

