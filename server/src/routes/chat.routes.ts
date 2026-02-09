import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createChat } from "../controllers/chat.controller.js";

const router = Router()

router.route('/create-chat').post(
    authMiddleware,
    createChat
)

export default router