import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { query } from "../controllers/message.controller.js";

const router = Router()

router.route('/query/:chatId/:documentId').get(
    authMiddleware,
    query
)

export default router