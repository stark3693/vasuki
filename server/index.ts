import express, { type Request, Response, NextFunction } from "express";
import multer from "multer";
import session from "express-session";
import cors from "cors";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  generalLimiter, 
  authLimiter, 
  adminLimiter, 
  apiLimiter,
  corsOptions,
  helmetConfig,
  validateInput,
  adminIPWhitelist,
  securityLogger,
  sqlInjectionProtection
} from "./security";

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware (applied first)
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(securityLogger);
app.use(sqlInjectionProtection);
app.use(validateInput);

// General rate limiting
app.use(generalLimiter);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Reduced to 10MB for security
    fieldSize: 10 * 1024 * 1024, // Reduced to 10MB for security
    files: 5, // Limit number of files
  },
});

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    console.log('🔍 Raw body received:', buf.toString());
  }
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Enhanced session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'vasukii-admin-secret-key-change-in-production-2024',
  resave: false,
  saveUninitialized: false,
  name: 'vasukii.session', // Custom session name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000, // Reduced to 2 hours for security
    sameSite: 'strict', // CSRF protection
    domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : undefined
  },
  rolling: true, // Reset expiration on activity
  genid: () => {
    // Generate cryptographically secure session IDs
    return crypto.randomBytes(32).toString('hex');
  }
}));

// Debug session middleware
app.use((req, res, next) => {
  console.log('🍪 Session debug - Session ID:', req.sessionID);
  console.log('🍪 Session debug - Session exists:', !!req.session);
  console.log('🍪 Session debug - Admin user in session:', !!req.session?.adminUser);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.

  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
