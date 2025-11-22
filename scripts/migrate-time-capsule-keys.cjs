const Database = require('better-sqlite3');
const path = require('path');

console.log('🔄 Migrating time_capsules table for unlock keys and verification...');

// Connect to the database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

try {
  // Check if the table exists
  const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='time_capsules'").get();
  
  if (!tableExists) {
    console.log('❌ Time capsules table does not exist. Please run the enhanced migration first.');
    process.exit(1);
  }

  console.log('📋 Adding unlock keys and verification columns to time_capsules table...');
  
  // Add new columns if they don't exist
  const tableInfo = sqlite.prepare("PRAGMA table_info(time_capsules)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  const newColumns = [
    { name: 'unlock_key', type: 'VARCHAR' },
    { name: 'unlock_password_hash', type: 'VARCHAR' },
    { name: 'biometric_data', type: 'TEXT' },
    { name: 'verification_questions', type: 'TEXT DEFAULT "[]"' },
    { name: 'access_codes', type: 'TEXT DEFAULT "[]"' },
    { name: 'unlock_attempts', type: 'INTEGER DEFAULT 0' },
    { name: 'max_unlock_attempts', type: 'INTEGER DEFAULT 3' },
    { name: 'is_locked_out', type: 'BOOLEAN DEFAULT false' },
    { name: 'unlock_history', type: 'TEXT DEFAULT "[]"' },
    { name: 'security_level', type: 'VARCHAR DEFAULT "standard" CHECK (security_level IN ("standard", "high", "maximum"))' }
  ];
  
  newColumns.forEach(col => {
    if (!existingColumns.includes(col.name)) {
      console.log(`➕ Adding ${col.name} column...`);
      sqlite.exec(`ALTER TABLE time_capsules ADD COLUMN ${col.name} ${col.type}`);
    }
  });
  
  // Create time_capsule_unlock_attempts table for tracking unlock attempts
  console.log('📋 Creating time_capsule_unlock_attempts table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_capsule_unlock_attempts (
      id VARCHAR PRIMARY KEY,
      capsule_id VARCHAR NOT NULL REFERENCES time_capsules(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      attempt_type VARCHAR NOT NULL,
      attempt_data TEXT,
      success BOOLEAN DEFAULT false,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR,
      user_agent TEXT
    )
  `);
  
  // Create time_capsule_access_codes table for temporary access codes
  console.log('📋 Creating time_capsule_access_codes table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_capsule_access_codes (
      id VARCHAR PRIMARY KEY,
      capsule_id VARCHAR NOT NULL REFERENCES time_capsules(id),
      access_code VARCHAR NOT NULL,
      created_by VARCHAR NOT NULL REFERENCES users(id),
      expires_at TIMESTAMP,
      uses_remaining INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Time capsule keys and verification migration completed successfully!');
  
  // Show final table structure
  const finalTableInfo = sqlite.prepare("PRAGMA table_info(time_capsules)").all();
  console.log('📋 Final time_capsules table structure:');
  finalTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}




