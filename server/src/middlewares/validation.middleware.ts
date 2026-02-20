import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

/**
 * Generic validation middleware factory
 * Validates request body against a Zod schema
 */
export const validateBody = (schema: z.ZodSchema) => {
  return asyncHandler(async (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      
      throw new ApiError(400, 'Validation failed', errors);
    }
    
    // Replace body with parsed data (applies transforms)
    req.body = result.data;
    next();
  });
};

/**
 * Query parameter validation
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return asyncHandler(async (req, res, next) => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      
      throw new ApiError(400, 'Query validation failed', errors);
    }
    
    req.query = result.data as typeof req.query;
    next();
  });
};

/**
 * Route parameter validation
 */
export const validateParams = (schema: z.ZodSchema) => {
  return asyncHandler(async (req, res, next) => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      
      throw new ApiError(400, 'Parameter validation failed', errors);
    }
    
    req.params = result.data as typeof req.params;
    next();
  });
};
