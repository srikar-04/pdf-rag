import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.schema.js';

/**
 * General API Rate Limiter
 * 
 * Why 100 requests per minute?
 * - ChatGPT: ~20 requests/minute for heavy users
 * - Our app: PDF RAG is more resource-intensive
 * - 100/min = 1.67/sec allows natural usage patterns
 * - Burst capacity for initial page loads
 * 
 * Window: 1 minute (60000ms)
 * - Short enough to not frustrate legitimate users
 * - Long enough to prevent sustained abuse
 */
export const apiLimiter = rateLimit({

  validate: {ip: false},

  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  
  // Key generator: Use user ID if authenticated, otherwise IP
  keyGenerator: (req): string => req.user?.id ?? ipKeyGenerator(req.ip ?? "anonymus"),
  
  // Handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
    });
  },
  
  // Skip successful requests? No, count all
  skipSuccessfulRequests: false,
  
  // Standard headers (RateLimit-*)
  standardHeaders: true,
  
  // Legacy headers (X-RateLimit-*)
  legacyHeaders: false,
});

/**
 * Upload Rate Limiter (Stricter)
 * 
 * Why 5 uploads per hour?
 * - PDF processing is resource-intensive (CPU, storage, embeddings)
 * - ImageKit storage costs money
 * - 5 uploads/hour allows legitimate testing while preventing abuse
 * - User can upload, test, iterate without hitting limits
 * 
 * Why 1 hour window?
 * - Prevents burst uploads
 * - Aligns with "per hour" mental model
 */
export const uploadLimiter = rateLimit({

  validate: {ip: false},

  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 uploads per hour
  
  keyGenerator: (req): string => req.user?.id ?? ipKeyGenerator(req.ip ?? "anonymus"),
  
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Upload limit exceeded (5 uploads per hour). Please try again later.',
    });
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Query Rate Limiter (Moderate)
 * 
 * Why 30 queries per minute?
 * - Query = LLM API call = costs money
 * - 30/min = 0.5/sec allows active conversation
 * - Prevents automated scraping
 */
export const queryLimiter = rateLimit({

  validate: {ip: false},

  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 queries per minute
  
  keyGenerator: (req): string => req.user?.id ?? ipKeyGenerator(req.ip ?? "anonymus"),
  
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Query limit exceeded (30 queries per minute). Please slow down.',
    });
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});
