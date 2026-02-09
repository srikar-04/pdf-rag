import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createChat } from "../controllers/chat.controller.js";

const router = Router()

router.route('/create-chat').post(
    authMiddleware,
    createChat
)

// get chat information (for specific chatId)
// chat updation (updating name)
// chat deletion (with no cascade document deletion)

export default router