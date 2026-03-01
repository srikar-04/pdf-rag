import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createChat, getAllChats, getChatById, getChatMessages, deleteChat } from "../controllers/chat.controller.js";

const router = Router()

// Get all chats for current user (Priority: P1)
router.route('/').get(
    authMiddleware,
    getAllChats
)

// Create new chat
router.route('/create-chat').post(
    authMiddleware,
    createChat
)

// Get single chat by ID (Priority: P1)
router.route('/:chatId').get(
    authMiddleware,
    getChatById
)

// Delete chat (Priority: P2)
router.route('/:chatId').delete(
    authMiddleware,
    deleteChat
)

// Get messages for a chat (Priority: P1)
router.route('/:chatId/messages').get(
    authMiddleware,
    getChatMessages
)

// chat updation (updating name)

export default router