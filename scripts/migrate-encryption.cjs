const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🔐 Starting encryption migration...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Add encryption fields to users table
db.serialize(() => {
  console.log('🔧 Adding encryption fields to users table...');
  
  // Add encryption key fields
  db.run(`
    ALTER TABLE users ADD COLUMN encryption_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encryption_key to users:', err.message);
    } else {
      console.log('✅ Added encryption_key to users table');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN public_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding public_key to users:', err.message);
    } else {
      console.log('✅ Added public_key to users table');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN private_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding private_key to users:', err.message);
    } else {
      console.log('✅ Added private_key to users table');
    }
  });

  // Add encryption fields to chat_messages table
  console.log('🔧 Adding encryption fields to chat_messages table...');
  
  db.run(`
    ALTER TABLE chat_messages ADD COLUMN encrypted_content TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encrypted_content to chat_messages:', err.message);
    } else {
      console.log('✅ Added encrypted_content to chat_messages table');
    }
  });

  db.run(`
    ALTER TABLE chat_messages ADD COLUMN encryption_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encryption_key to chat_messages:', err.message);
    } else {
      console.log('✅ Added encryption_key to chat_messages table');
    }
  });

  db.run(`
    ALTER TABLE chat_messages ADD COLUMN is_encrypted BOOLEAN DEFAULT 0;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding is_encrypted to chat_messages:', err.message);
    } else {
      console.log('✅ Added is_encrypted to chat_messages table');
    }
  });

  // Add encryption fields to vasks table
  console.log('🔧 Adding encryption fields to vasks table...');
  
  db.run(`
    ALTER TABLE vasks ADD COLUMN encrypted_content TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encrypted_content to vasks:', err.message);
    } else {
      console.log('✅ Added encrypted_content to vasks table');
    }
  });

  db.run(`
    ALTER TABLE vasks ADD COLUMN encryption_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encryption_key to vasks:', err.message);
    } else {
      console.log('✅ Added encryption_key to vasks table');
    }
  });

  db.run(`
    ALTER TABLE vasks ADD COLUMN is_encrypted BOOLEAN DEFAULT 0;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding is_encrypted to vasks:', err.message);
    } else {
      console.log('✅ Added is_encrypted to vasks table');
    }
  });

  // Add encryption fields to comments table
  console.log('🔧 Adding encryption fields to comments table...');
  
  db.run(`
    ALTER TABLE comments ADD COLUMN encrypted_content TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encrypted_content to comments:', err.message);
    } else {
      console.log('✅ Added encrypted_content to comments table');
    }
  });

  db.run(`
    ALTER TABLE comments ADD COLUMN encryption_key TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding encryption_key to comments:', err.message);
    } else {
      console.log('✅ Added encryption_key to comments table');
    }
  });

  db.run(`
    ALTER TABLE comments ADD COLUMN is_encrypted BOOLEAN DEFAULT 0;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Error adding is_encrypted to comments:', err.message);
    } else {
      console.log('✅ Added is_encrypted to comments table');
    }
  });

  // Create encryption keys table
  console.log('🔧 Creating encryption_keys table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      key_type TEXT NOT NULL,
      key_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) {
      console.error('❌ Error creating encryption_keys table:', err.message);
    } else {
      console.log('✅ Created encryption_keys table');
    }
  });

  // Create encrypted_sessions table
  console.log('🔧 Creating encrypted_sessions table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS encrypted_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      encryption_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) {
      console.error('❌ Error creating encrypted_sessions table:', err.message);
    } else {
      console.log('✅ Created encrypted_sessions table');
    }
  });

  // Create audit_log table for encryption events
  console.log('🔧 Creating audit_log table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      encryption_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) {
      console.error('❌ Error creating audit_log table:', err.message);
    } else {
      console.log('✅ Created audit_log table');
    }
  });

  console.log('🎉 Encryption migration completed successfully!');
  console.log('🔐 Your database is now ready for end-to-end encryption');
});

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err.message);
  } else {
    console.log('✅ Database connection closed');
  }
});
