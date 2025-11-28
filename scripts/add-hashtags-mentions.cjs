const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('Adding hashtags and mentions tables to database...');

try {
  // Create hashtags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hashtags (
      id TEXT PRIMARY KEY,
      tag TEXT NOT NULL UNIQUE,
      count INTEGER DEFAULT 1,
      last_used INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Create vask_hashtags junction table (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vask_hashtags (
      vask_id TEXT NOT NULL,
      hashtag_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (vask_id, hashtag_id),
      FOREIGN KEY (vask_id) REFERENCES vasks(id) ON DELETE CASCADE,
      FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE
    );
  `);

  // Create mentions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mentions (
      id TEXT PRIMARY KEY,
      vask_id TEXT NOT NULL,
      mentioner_id TEXT NOT NULL,
      mentioned_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY (vask_id) REFERENCES vasks(id) ON DELETE CASCADE,
      FOREIGN KEY (mentioner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (mentioned_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags(count DESC);
    CREATE INDEX IF NOT EXISTS idx_hashtags_last_used ON hashtags(last_used DESC);
    CREATE INDEX IF NOT EXISTS idx_vask_hashtags_vask_id ON vask_hashtags(vask_id);
    CREATE INDEX IF NOT EXISTS idx_vask_hashtags_hashtag_id ON vask_hashtags(hashtag_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_id ON mentions(mentioned_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_vask_id ON mentions(vask_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_is_read ON mentions(is_read);
  `);

  console.log('✅ Hashtags table created successfully!');
  console.log('✅ Mentions table created successfully!');
  console.log('✅ Indexes created successfully!');
} catch (error) {
  console.error('❌ Error creating tables:', error);
  process.exit(1);
} finally {
  db.close();
}
