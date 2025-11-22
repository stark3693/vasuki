const Database = require('better-sqlite3');

console.log('🔧 Complete database schema fix...');

// Create database connection
const sqlite = new Database('./database.sqlite');

try {
  console.log('📝 Adding all missing tables and columns...');

  // Add password_hash column to chat_rooms table if it doesn't exist
  try {
    sqlite.exec(`
      ALTER TABLE chat_rooms ADD COLUMN password_hash TEXT
    `);
    console.log('✅ Added password_hash column to chat_rooms table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  password_hash column already exists in chat_rooms table');
    } else {
      throw error;
    }
  }

  // Create chat_invitations table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_invitations (
      id VARCHAR PRIMARY KEY,
      room_id VARCHAR NOT NULL REFERENCES chat_rooms(id),
      inviter_id VARCHAR NOT NULL REFERENCES users(id),
      invitee_id VARCHAR NOT NULL REFERENCES users(id),
      invitation_token VARCHAR UNIQUE NOT NULL,
      status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP
    )
  `);
  console.log('✅ Created chat_invitations table');

  // Create chat_room_access table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_room_access (
      id VARCHAR PRIMARY KEY,
      room_id VARCHAR NOT NULL REFERENCES chat_rooms(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      access_type VARCHAR NOT NULL CHECK (access_type IN ('creator', 'invited', 'password_joined', 'admin')),
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, user_id)
    )
  `);
  console.log('✅ Created chat_room_access table');

  // Create audit_log table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      action VARCHAR NOT NULL,
      resource_type VARCHAR NOT NULL,
      resource_id VARCHAR NOT NULL,
      encryption_status VARCHAR NOT NULL,
      ip_address VARCHAR,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Created audit_log table');

  // Fix vasks table - add missing media columns
  const vasksColumns = [
    'media_urls TEXT DEFAULT "[]"',
    'media_types TEXT DEFAULT "[]"', 
    'media_filenames TEXT DEFAULT "[]"',
    'media_sizes TEXT DEFAULT "[]"'
  ];

  for (const column of vasksColumns) {
    try {
      sqlite.exec(`ALTER TABLE vasks ADD COLUMN ${column}`);
      console.log(`✅ Added vasks column: ${column.split(' ')[0]}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  Vasks column ${column.split(' ')[0]} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Fix users table - add missing encryption columns
  const usersColumns = [
    'encryption_key TEXT',
    'public_key TEXT', 
    'private_key TEXT'
  ];

  for (const column of usersColumns) {
    try {
      sqlite.exec(`ALTER TABLE users ADD COLUMN ${column}`);
      console.log(`✅ Added users column: ${column.split(' ')[0]}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  Users column ${column.split(' ')[0]} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Fix vasks table - add missing encryption columns
  const vasksEncryptionColumns = [
    'encrypted_content TEXT',
    'encryption_key TEXT'
  ];

  for (const column of vasksEncryptionColumns) {
    try {
      sqlite.exec(`ALTER TABLE vasks ADD COLUMN ${column}`);
      console.log(`✅ Added vasks encryption column: ${column.split(' ')[0]}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  Vasks encryption column ${column.split(' ')[0]} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Fix comments table - add missing encryption columns
  const commentsEncryptionColumns = [
    'encrypted_content TEXT',
    'encryption_key TEXT'
  ];

  for (const column of commentsEncryptionColumns) {
    try {
      sqlite.exec(`ALTER TABLE comments ADD COLUMN ${column}`);
      console.log(`✅ Added comments encryption column: ${column.split(' ')[0]}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  Comments encryption column ${column.split(' ')[0]} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Create indexes for better performance
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_invitations_invitee_id ON chat_invitations(invitee_id);
    CREATE INDEX IF NOT EXISTS idx_chat_invitations_token ON chat_invitations(invitation_token);
    CREATE INDEX IF NOT EXISTS idx_chat_invitations_room_id ON chat_invitations(room_id);
    CREATE INDEX IF NOT EXISTS idx_chat_room_access_room_id ON chat_room_access(room_id);
    CREATE INDEX IF NOT EXISTS idx_chat_room_access_user_id ON chat_room_access(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_room_access_type ON chat_room_access(access_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_vasks_author_id ON vasks(author_id);
    CREATE INDEX IF NOT EXISTS idx_vasks_created_at ON vasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_vasks_is_pinned ON vasks(is_pinned);
  `);
  console.log('✅ Created all indexes');

  console.log('🎉 Complete database schema fix successful!');
  console.log('');
  console.log('📋 Fixed Issues:');
  console.log('- ✅ Added password_hash column to chat_rooms');
  console.log('- ✅ Created chat_invitations table');
  console.log('- ✅ Created chat_room_access table');
  console.log('- ✅ Created audit_log table');
  console.log('- ✅ Added media columns to vasks table');
  console.log('- ✅ Added encryption columns to users table');
  console.log('- ✅ Added encryption columns to vasks table');
  console.log('- ✅ Added encryption columns to comments table');
  console.log('- ✅ Added performance indexes');
  console.log('');
  console.log('🚀 All features should now work properly!');

} catch (error) {
  console.error('❌ Complete database fix failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}
