#!/usr/bin/env tsx

/**
 * Migration script to add encryption support to existing data
 * This script adds the new encryption fields to the database schema
 * and marks existing data as unencrypted (isEncrypted = false)
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Database connection
const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient);

async function migrateToEncryption() {
  console.log('🔐 Starting migration to add encryption support...');

  try {
    // Add new columns to existing tables
    console.log('📝 Adding encryption columns to database tables...');

    // Add columns to users table
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS bio_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE
    `;

    // Add columns to vasks table
    await sql`
      ALTER TABLE vasks 
      ADD COLUMN IF NOT EXISTS content_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE
    `;

    // Add columns to comments table
    await sql`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS content_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE
    `;

    // Add columns to polls table
    await sql`
      ALTER TABLE polls 
      ADD COLUMN IF NOT EXISTS title_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS description_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS options_encrypted JSONB,
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE
    `;

    console.log('✅ Database schema updated successfully');

    // Update existing data to mark as unencrypted
    console.log('📊 Updating existing data to mark as unencrypted...');

    // Update users
    const usersUpdated = await sql`
      UPDATE users 
      SET is_encrypted = FALSE 
      WHERE is_encrypted IS NULL
    `;
    console.log(`👤 Updated ${usersUpdated.count} users`);

    // Update vasks
    const vasksUpdated = await sql`
      UPDATE vasks 
      SET is_encrypted = FALSE 
      WHERE is_encrypted IS NULL
    `;
    console.log(`📝 Updated ${vasksUpdated.count} vasks`);

    // Update comments
    const commentsUpdated = await sql`
      UPDATE comments 
      SET is_encrypted = FALSE 
      WHERE is_encrypted IS NULL
    `;
    console.log(`💬 Updated ${commentsUpdated.count} comments`);

    // Update polls
    const pollsUpdated = await sql`
      UPDATE polls 
      SET is_encrypted = FALSE 
      WHERE is_encrypted IS NULL
    `;
    console.log(`📊 Updated ${pollsUpdated.count} polls`);

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Added encryption support columns to all tables');
    console.log('- Marked all existing data as unencrypted');
    console.log('- New data will be encrypted based on user wallet connection');
    console.log('');
    console.log('⚠️  Important Notes:');
    console.log('- Existing data remains unencrypted for backward compatibility');
    console.log('- Users can re-save their profiles to enable encryption');
    console.log('- New posts/comments will be encrypted if wallet is connected');
    console.log('- Consider running a data migration to encrypt existing content if needed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToEncryption()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateToEncryption };
