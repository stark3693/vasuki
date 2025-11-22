# Database Setup Guide for VasukiiMicroblog with Encryption

## 🎯 Overview

The VasukiiMicroblog application now requires a PostgreSQL database to support the new encryption features. You have two options for setting up the database.

## 🚀 Option 1: Neon Database (Recommended)

### Step 1: Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project

### Step 2: Get Connection String
1. In your Neon dashboard, go to "Connection Details"
2. Copy the connection string (it looks like: `postgresql://username:password@hostname/database?sslmode=require`)

### Step 3: Configure Environment
1. Create a `.env` file in the root directory:
```bash
cp env-template.txt .env
```

2. Add your database URL to `.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Web3 Configuration
VITE_WALLET_CONNECT_PROJECT_ID=cf9dc37defde9f8e52b784cd7ebb1cdd
VITE_VSK_TOKEN_ADDRESS=0x5CB7681Ce38c8bD8089DEd49E0B585596b423B1C
VITE_PREDICTION_POLL_ADDRESS=
```

### Step 4: Run Database Migration
```bash
npm run db:push
npm run migrate:encryption
```

## 🏠 Option 2: Local PostgreSQL

### Step 1: Install PostgreSQL
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`

### Step 2: Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vasukii_microblog;

# Create user (optional)
CREATE USER vasukii_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vasukii_microblog TO vasukii_user;

# Exit
\q
```

### Step 3: Configure Environment
Create `.env` file:
```env
# Database Configuration
DATABASE_URL=postgresql://vasukii_user:your_password@localhost:5432/vasukii_microblog

# Web3 Configuration
VITE_WALLET_CONNECT_PROJECT_ID=cf9dc37defde9f8e52b784cd7ebb1cdd
VITE_VSK_TOKEN_ADDRESS=0x5CB7681Ce38c8bD8089DEd49E0B585596b423B1C
VITE_PREDICTION_POLL_ADDRESS=
```

### Step 4: Run Database Migration
```bash
npm run db:push
npm run migrate:encryption
```

## 🔧 Database Schema for Encryption

The application will automatically create these tables with encryption support:

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  unique_id VARCHAR UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  display_name TEXT,
  display_name_encrypted JSONB,  -- NEW: Encrypted display name
  bio TEXT,
  bio_encrypted JSONB,           -- NEW: Encrypted bio
  profile_image TEXT,
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_encrypted BOOLEAN DEFAULT FALSE  -- NEW: Encryption flag
);
```

### Vasks Table
```sql
CREATE TABLE vasks (
  id VARCHAR PRIMARY KEY,
  author_id VARCHAR REFERENCES users(id),
  content TEXT,
  content_encrypted JSONB,       -- NEW: Encrypted content
  image_url TEXT,
  image_hash TEXT,
  ipfs_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE  -- NEW: Encryption flag
);
```

### Comments Table
```sql
CREATE TABLE comments (
  id VARCHAR PRIMARY KEY,
  vask_id VARCHAR REFERENCES vasks(id),
  author_id VARCHAR REFERENCES users(id),
  content TEXT NOT NULL,
  content_encrypted JSONB,       -- NEW: Encrypted content
  created_at TIMESTAMP DEFAULT NOW(),
  is_encrypted BOOLEAN DEFAULT FALSE  -- NEW: Encryption flag
);
```

### Polls Table
```sql
CREATE TABLE polls (
  id VARCHAR PRIMARY KEY,
  creator_id VARCHAR REFERENCES users(id),
  title TEXT NOT NULL,
  title_encrypted JSONB,         -- NEW: Encrypted title
  description TEXT,
  description_encrypted JSONB,   -- NEW: Encrypted description
  options JSONB NOT NULL,
  options_encrypted JSONB,       -- NEW: Encrypted options
  deadline TIMESTAMP NOT NULL,
  correct_option INTEGER,
  is_resolved BOOLEAN DEFAULT FALSE,
  is_staking_enabled BOOLEAN DEFAULT FALSE,
  total_staked TEXT DEFAULT '0',
  votes JSONB DEFAULT '{}',
  stakes JSONB DEFAULT '{}',
  user_votes JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_encrypted BOOLEAN DEFAULT FALSE  -- NEW: Encryption flag
);
```

## ✅ Verification Steps

After setting up the database, verify everything works:

### 1. Test Database Connection
```bash
npm run db:push
```
Should show: "✅ Database schema updated successfully"

### 2. Test Migration
```bash
npm run migrate:encryption
```
Should show: "🎉 Migration completed successfully!"

### 3. Test Application
```bash
npm run dev
```
- Start the application
- Connect your wallet
- Create a new post
- Verify it's encrypted in the database

## 🔍 Troubleshooting

### Common Issues

#### "No database connection string provided"
- **Solution**: Make sure `.env` file exists with `DATABASE_URL`

#### "Database does not exist"
- **Solution**: Create the database manually or check connection string

#### "Permission denied"
- **Solution**: Check database user permissions

#### Migration fails
- **Solution**: Ensure database is accessible and user has CREATE/ALTER permissions

### Debug Commands
```bash
# Check if .env file exists
ls -la .env

# Test database connection
npm run db:push

# Check database tables
psql $DATABASE_URL -c "\dt"
```

## 🚀 Next Steps

1. **Choose your database option** (Neon recommended)
2. **Set up the database** following the steps above
3. **Run the migrations** to add encryption support
4. **Test the application** to ensure encryption works
5. **Deploy to production** with your chosen database

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your `.env` file configuration
3. Test database connectivity
4. Review the migration logs

The database setup is crucial for the encryption features to work properly!
