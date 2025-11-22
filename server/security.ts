import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// General rate limiting
export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for auth endpoints
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later.'
);

// Admin rate limiting (very strict)
export const adminLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many admin requests, please try again later.'
);

// API rate limiting
export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // limit each IP to 50 requests per windowMs
  'Too many API requests, please try again later.'
);

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In development, allow everything
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, specify allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'https://localhost:5173',
      'https://localhost:3000',
      'https://localhost:5000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Security headers configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false // Disable HSTS in development
});

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common XSS attempts
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// IP whitelist middleware for admin
export const adminIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  
  // In development, allow all localhost IPs
  if (process.env.NODE_ENV === 'development') {
    const isLocalhost = clientIP?.includes('127.0.0.1') || 
                       clientIP?.includes('::1') || 
                       clientIP?.includes('::ffff:127.0.0.1') ||
                       clientIP?.includes('localhost') ||
                       clientIP?.includes('192.168.') ||
                       clientIP?.includes('10.0.') ||
                       clientIP?.includes('172.');
    
    if (isLocalhost) {
      return next();
    }
  }
  
  // In production, restrict to specific IPs
  const allowedIPs = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'localhost'
  ];

  // In production, you would add your server IPs here
  // allowedIPs.push('your-server-ip');

  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    console.log(`🚫 Admin access denied from IP: ${clientIP}`);
    res.status(403).json({ 
      error: 'Access denied',
      message: 'Admin access is restricted to authorized IPs only'
    });
  }
};

// Request logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const url = req.url;

  console.log(`🔒 [${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);

  // Log suspicious activity
  if (url.includes('admin') || url.includes('login')) {
    console.log(`🔐 Security Event: ${method} ${url} from ${ip}`);
  }

  next();
};

// Admin session validation middleware
export const validateAdminSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return res.status(401).json({ error: 'No session found' });
  }

  if (!req.session.adminUser) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Check session expiration (24 hours)
  const sessionAge = Date.now() - (req.session.lastActivity || Date.now());
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (sessionAge > maxAge) {
    req.session.destroy((err) => {
      if (err) console.error('Session destruction error:', err);
    });
    return res.status(401).json({ error: 'Session expired' });
  }

  // Update last activity
  req.session.lastActivity = Date.now();
  next();
};

// API key validation (for future use)
export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // In production, validate against database
  const validAPIKeys = ['dev-api-key-123']; // Replace with actual validation
  
  if (!apiKey || !validAPIKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  
  next();
};

// SQL injection protection
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
    /(\b(OR|AND)\s+1\s*=\s*1)/gi,
    /(\b(OR|AND)\s+0\s*=\s*0)/gi,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
    /(UNION\s+SELECT)/gi,
    /(DROP\s+TABLE)/gi,
    /(DELETE\s+FROM)/gi,
    /(INSERT\s+INTO)/gi,
    /(UPDATE\s+SET)/gi
  ];

  const checkString = (str: string): boolean => {
    return dangerousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.log(`🚨 SQL Injection attempt detected from IP: ${req.ip}`);
    return res.status(400).json({ 
      error: 'Invalid input detected',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};
