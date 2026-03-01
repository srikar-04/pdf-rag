import express, { urlencoded, type NextFunction, type Request, type Response } from "express";
import cors from 'cors'
import helmet from 'helmet'
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

import { ExpressAuth } from "@auth/express";
import { authConfig } from "./config/auth.config.js";
import { env } from "./config/env.schema.js";

import authMiddleware from "./middlewares/auth.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import authRouter from './routes/auth.routes.js'
import documentRouter from './routes/document.routes.js'
import chatRouter from './routes/chat.routes.js'
import messageRouter from './routes/message.route.js'
import healthRouter from './routes/health.routes.js'

// Auth configuration moved to src/config/auth.config.ts

const app = express()

// SECURITY MIDDLEWARES

// Helmet: Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// CORS: Cross-origin resource sharing
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Request-Time'],
}))

// Rate limiting: Prevent abuse
app.use('/api/', apiLimiter)

// BODY PARSING MIDDLEWARES (with size limits)
app.use(express.json({ limit: '10kb' }))
app.use(urlencoded({ extended: true, limit: '10kb' }))

app.set("trust proxy", true)
app.use("/auth", ExpressAuth(authConfig))


// HEALTH CHECKS (before rate limiting)
app.use('/health', healthRouter)
app.use('/ready', healthRouter)


// ROUTES

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/document', documentRouter)
app.use('/api/v1/chat', chatRouter)
app.use('/api/v1/message', messageRouter)


app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught by middleware:', err)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      new ApiResponse(err.statusCode, {}, err.message)
    )
  }

  // Handle unexpected errors
  return res.status(500).json(
    new ApiResponse(500, {}, 'Internal Server Error')
  )
})

export default app