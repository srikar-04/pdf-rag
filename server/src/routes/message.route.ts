import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validation.middleware.js";
import { queryLimiter } from "../middlewares/rateLimit.middleware.js";
import { query } from "../controllers/message.controller.js";
import { UserMessageSchema } from "../schemas/message.schema.js";

const router = Router()

router.route('/query/:chatId/:documentId').get(
    authMiddleware,
    queryLimiter, // Rate limit: 30 queries per minute
    validateBody(UserMessageSchema), // validate query body
    query
)

export default router