const Database = require('better-sqlite3');
const path = require('path');

console.log('🔄 Migrating time_capsules table for enhanced features...');

// Connect to the database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const sqlite = new Database(dbPath);

try {
  // Check if the table exists
  const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='time_capsules'").get();
  
  if (!tableExists) {
    console.log('📋 Creating time_capsules table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS time_capsules (
        id VARCHAR PRIMARY KEY,
        creator_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        unlock_condition VARCHAR NOT NULL,
        unlock_value TEXT,
        unlock_date TIMESTAMP,
        status VARCHAR DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'expired')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unlocked_at TIMESTAMP,
        media_urls TEXT DEFAULT '[]',
        media_types TEXT DEFAULT '[]',
        media_filenames TEXT DEFAULT '[]',
        media_sizes TEXT DEFAULT '[]',
        unlock_type VARCHAR DEFAULT 'date' CHECK (unlock_type IN ('date', 'emotion', 'collective', 'ai_prediction', 'quantum_random', 'environmental', 'age', 'biometric')),
        trigger_data TEXT DEFAULT '{}',
        participants_count INTEGER DEFAULT 1,
        target_participants INTEGER DEFAULT 1,
        is_public BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        emotional_state TEXT,
        ai_predictions TEXT DEFAULT '{}',
        environmental_conditions TEXT DEFAULT '{}',
        quantum_seed VARCHAR,
        inheritance_data TEXT DEFAULT '{}'
      )
    `);
  } else {
    console.log('📋 Adding enhanced columns to time_capsules table...');
    
    // Add new columns if they don't exist
    const tableInfo = sqlite.prepare("PRAGMA table_info(time_capsules)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    const newColumns = [
      { name: 'unlock_type', type: 'VARCHAR DEFAULT "date" CHECK (unlock_type IN ("date", "emotion", "collective", "ai_prediction", "quantum_random", "environmental", "age", "biometric"))' },
      { name: 'trigger_data', type: 'TEXT DEFAULT "{}"' },
      { name: 'participants_count', type: 'INTEGER DEFAULT 1' },
      { name: 'target_participants', type: 'INTEGER DEFAULT 1' },
      { name: 'is_public', type: 'BOOLEAN DEFAULT false' },
      { name: 'view_count', type: 'INTEGER DEFAULT 0' },
      { name: 'emotional_state', type: 'TEXT' },
      { name: 'ai_predictions', type: 'TEXT DEFAULT "{}"' },
      { name: 'environmental_conditions', type: 'TEXT DEFAULT "{}"' },
      { name: 'quantum_seed', type: 'VARCHAR' },
      { name: 'inheritance_data', type: 'TEXT DEFAULT "{}"' }
    ];
    
    newColumns.forEach(col => {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding ${col.name} column...`);
        sqlite.exec(`ALTER TABLE time_capsules ADD COLUMN ${col.name} ${col.type}`);
      }
    });
  }
  
  // Create time_capsule_participants table for collective capsules
  console.log('📋 Creating time_capsule_participants table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_capsule_participants (
      id VARCHAR PRIMARY KEY,
      capsule_id VARCHAR NOT NULL REFERENCES time_capsules(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      contribution TEXT,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(capsule_id, user_id)
    )
  `);
  
  // Create time_capsule_unlock_events table for tracking unlock events
  console.log('📋 Creating time_capsule_unlock_events table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_capsule_unlock_events (
      id VARCHAR PRIMARY KEY,
      capsule_id VARCHAR NOT NULL REFERENCES time_capsules(id),
      unlock_type VARCHAR NOT NULL,
      trigger_data TEXT,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT false
    )
  `);
  
  console.log('✅ Time capsules enhanced migration completed successfully!');
  
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






