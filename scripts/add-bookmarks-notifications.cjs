const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('🚀 Adding Bookmarks and Notifications tables...\n');

try {
  // Create bookmarks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      vask_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, vask_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vask_id) REFERENCES vasks(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Bookmarks table created successfully!');

  // Create notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      vask_id TEXT,
      comment_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vask_id) REFERENCES vasks(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Notifications table created successfully!');

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_vask_id ON bookmarks(vask_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
  `);
  console.log('✅ Indexes created successfully!');

  console.log('\n🎉 Migration completed successfully!');
  console.log('\n📊 Table structures:');
  console.log('   - bookmarks: id, user_id, vask_id, created_at');
  console.log('   - notifications: id, user_id, type, actor_id, vask_id, comment_id, is_read, created_at');
  
} catch (error) {
  console.error('❌ Error creating tables:', error);
  process.exit(1);
} finally {
  db.close();
}
