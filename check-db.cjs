const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables in database.sqlite:');
tables.forEach(t => console.log('  -', t.name));

// Check for bookmarks and notifications tables
const hasBookmarks = tables.some(t => t.name === 'bookmarks');
const hasNotifications = tables.some(t => t.name === 'notifications');
console.log('\nHas bookmarks table:', hasBookmarks);
console.log('Has notifications table:', hasNotifications);

db.close();
