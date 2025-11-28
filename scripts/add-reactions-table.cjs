const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('Adding reactions table to database...');

try {
  // Create reactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      vask_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      is_premium INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (vask_id) REFERENCES vasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(vask_id, user_id)
    );
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reactions_vask_id ON reactions(vask_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_emoji ON reactions(emoji);
  `);

  console.log('✅ Reactions table created successfully!');
  console.log('✅ Indexes created successfully!');
} catch (error) {
  console.error('❌ Error creating reactions table:', error);
  process.exit(1);
} finally {
  db.close();
}
