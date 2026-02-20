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
  
  OLLAMA_BASE_URL: z.url().default('http://localhost:11434'),
  EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  EMBEDDING_TIMEOUT_MS: z.string().default('60000').transform(Number),
   
  CORS_ORIGIN: z.url('CORS_ORIGIN must be a valid URL'),
  
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