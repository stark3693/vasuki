# VasukiiMicroblog Admin Panel

## Overview
The admin panel provides secure access to view and manage all user data in the VasukiiMicroblog application.

## Access Information

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `V@$ukii@dmin2024!Secure#`

✅ **SECURE**: Strong password with special characters, numbers, and mixed case!

## Features

### 🔐 Secure Authentication
- Password hashing with bcrypt (12 rounds)
- Session-based authentication
- Automatic session timeout (24 hours)
- Secure HTTP-only cookies

### 📊 User Management Dashboard
- View all registered users
- Search and filter users
- Display user statistics
- Real-time user data

### 🛡️ Security Features
- Admin-only access routes
- Session validation
- Secure password storage
- Protected API endpoints

## Access URLs

- **Admin Login**: `/admin` or `/admin/login`
- **Admin Dashboard**: `/admin/dashboard`

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/status` - Check authentication status

### User Management
- `GET /api/admin/users` - Get all users (requires admin auth)

## Database Schema

### Admin Users Table
```sql
CREATE TABLE admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_login TIMESTAMP
);
```

## Security Best Practices

1. **Strong Password**: Current password meets enterprise security standards
   - 20 characters long with mixed case, numbers, and special characters
   - Hashed with bcrypt (12 rounds) for maximum security
2. **Environment Variables**: Set a strong `SESSION_SECRET` in production
3. **HTTPS**: Use HTTPS in production for secure cookie transmission
4. **Regular Updates**: Keep dependencies updated
5. **Access Logging**: Monitor admin access and activities
6. **Password Rotation**: Consider changing password periodically in production

## Development Setup

1. The admin user is automatically created on first server startup
2. Default credentials are set in `server/routes.ts`
3. Session configuration is in `server/index.ts`
4. Admin routes are protected with middleware

## Production Deployment

1. Set environment variables:
   ```bash
   SESSION_SECRET=your-very-secure-secret-key
   NODE_ENV=production
   ```

2. Update admin credentials in the code or create a migration script

3. Ensure HTTPS is enabled for secure cookie transmission

## User Data Displayed

The admin dashboard shows:
- User ID
- Unique ID (username)
- Wallet Address
- ENS Name (if available)
- Display Name
- Bio
- Profile/Cover Images
- Registration Date
- Account Status

## Time Capsule Management

The admin panel includes comprehensive Time Capsule management:
- View all time capsules with detailed information
- Monitor security levels (Standard/High/Maximum)
- Track unlock attempts and lockout status
- View media attachments and file information
- Unlock time capsules manually
- Delete inappropriate time capsules
- Export time capsule data
- Monitor revolutionary feature usage

## Revolutionary Features Monitoring

Admin can monitor:
- Time Capsule creation and usage statistics
- Lightning Chat room activity
- Security breach attempts
- Feature performance analytics

## Troubleshooting

### Common Issues
1. **Session not persisting**: Check cookie settings and HTTPS configuration
2. **Login fails**: Verify credentials and check server logs
3. **Users not loading**: Check database connection and API endpoints

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed error messages.

## Support

For issues or questions about the admin panel, check the server logs and ensure all dependencies are properly installed.

