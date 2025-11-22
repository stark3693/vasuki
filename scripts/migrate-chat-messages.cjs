const Database = require('better-sqlite3');
const path = require('path');

console.log('🔄 Migrating chat_messages table...');

// Connect to the database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

try {
  // Check if the columns already exist
  const tableInfo = sqlite.prepare("PRAGMA table_info(chat_messages)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('📋 Existing columns:', existingColumns);
  
  // Add missing columns if they don't exist
  if (!existingColumns.includes('message_type')) {
    console.log('➕ Adding message_type column...');
    sqlite.exec('ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR DEFAULT "text"');
  }
  
  if (!existingColumns.includes('media_url')) {
    console.log('➕ Adding media_url column...');
    sqlite.exec('ALTER TABLE chat_messages ADD COLUMN media_url VARCHAR');
  }
  
  if (!existingColumns.includes('media_filename')) {
    console.log('➕ Adding media_filename column...');
    sqlite.exec('ALTER TABLE chat_messages ADD COLUMN media_filename VARCHAR');
  }
  
  if (!existingColumns.includes('media_size')) {
    console.log('➕ Adding media_size column...');
    sqlite.exec('ALTER TABLE chat_messages ADD COLUMN media_size INTEGER');
  }
  
  // Update existing messages to have message_type = 'text'
  console.log('🔄 Updating existing messages...');
  sqlite.exec("UPDATE chat_messages SET message_type = 'text' WHERE message_type IS NULL");
  
  console.log('✅ Chat messages table migration completed successfully!');
  
  // Show final table structure
  const finalTableInfo = sqlite.prepare("PRAGMA table_info(chat_messages)").all();
  console.log('📋 Final table structure:');
  finalTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}





