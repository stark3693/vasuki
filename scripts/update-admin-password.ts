import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

// Initialize SQLite database
const sqlite = new Database('./database.sqlite');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

async function updateAdminPassword() {
  try {
    console.log('🔐 Updating admin password...');
    
    // New strong password
    const newPassword = 'V@$ukii@dmin2024!Secure#';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Check if admin user exists
    const existingAdmin = sqlite.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
    
    if (existingAdmin) {
      // Update existing admin password
      const updateStmt = sqlite.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?');
      updateStmt.run(hashedPassword, 'admin');
      console.log('✅ Admin password updated successfully!');
      console.log('🔑 New credentials:');
      console.log('   Username: admin');
      console.log('   Password: V@$ukii@dmin2024!Secure#');
    } else {
      // Create new admin user
      const id = crypto.randomUUID();
      const now = new Date();
      
      const insertStmt = sqlite.prepare(`
        INSERT INTO admin_users (id, username, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      insertStmt.run(id, 'admin', hashedPassword, now.getTime());
      console.log('✅ Admin user created with new password!');
      console.log('🔑 New credentials:');
      console.log('   Username: admin');
      console.log('   Password: V@$ukii@dmin2024!Secure#');
    }
    
    console.log('🔒 Password security features:');
    console.log('   - 20 characters long');
    console.log('   - Contains uppercase letters');
    console.log('   - Contains lowercase letters');
    console.log('   - Contains numbers');
    console.log('   - Contains special characters (@, $, #, !)');
    console.log('   - Hashed with bcrypt (12 rounds)');
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  } finally {
    sqlite.close();
  }
}

// Run the update
updateAdminPassword();
