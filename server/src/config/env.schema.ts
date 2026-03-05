import { z } from 'zod';

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'), // -- PENDING
  
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  QDRANT_URL: z.url('QDRANT_URL must be a valid URL'),
  QDRANT_API_KEY: z.string().min(1, 'QDRANT_API_KEY is required'),
  
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, 'IMAGEKIT_PRIVATE_KEY is required'),
  
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_ACCOUNT_ID is required'),
  CLOUDFLARE_API_TOKEN: z.string().min(1, 'CLOUDFLARE_API_TOKEN is required'),
  CLOUDFLARE_EMBEDDING_MODEL: z.string().default('@cf/baai/bge-base-en-v1.5'),
  EMBEDDING_VECTOR_DIMENSION: z.string().default('768').transform(Number),
  EMBEDDING_TIMEOUT_MS: z.string().default('60000').transform(Number),
   
  CORS_ORIGIN: z.url('CORS_ORIGIN must be a valid URL'),
  FRONTEND_URL: z.url('FRONTEND_URL must be a valid URL').optional(),
  
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number), 
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'), // -- PENDING

  AUTH_SECRET: z.string("auth secret must be a valid string"),
  AUTH_GITHUB_ID: z.string("github id must be a valid string"),
  AUTH_GITHUB_SECRET: z.string("github secret must be a valid string"),
  AUTH_GOOGLE_ID: z.string("google id must be a valid string"),
  AUTH_GOOGLE_SECRET: z.string("google secret must be a valid string")
});


export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
