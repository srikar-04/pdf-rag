import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ChatCreateSchema } from "../schemas/chat.schema.js";
import { prisma } from "../lib/prisma.js";
import ApiResponse from "../utils/apiResponse.js";


/**
 * Get All Chats
 * Priority: P1 - Critical
 * 
 * Lists all chats for the current authenticated user
 * Returns chats sorted by updatedAt (most recent first)
 */
const getAllChats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    const chats = await prisma.chat.findMany({
        where: {
            userId: userId,
        },
        orderBy: {
            updatedAt: 'desc',
        },
        select: {
            id: true,
            title: true,
            chatStatus: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    res.json(new ApiResponse(200, chats, "Chats fetched successfully"));
});


/**
 * Get Chat By ID
 * Priority: P1 - Critical
 * 
 * Returns a single chat with its associated documents
 * Includes document details through ChatDocument junction table
 */
const getChatById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!chatId || Array.isArray(chatId)) {
        throw new ApiError(400, "Valid Chat ID is required");
    }

    // Find chat and verify ownership
    const chat = await prisma.chat.findFirst({
        where: {
            id: chatId,
            userId: userId,
        },
        include: {
            documents: {
                include: {
                    document: {
                        select: {
                            id: true,
                            documentName: true,
                            storagePath: true,
                            documentStatus: true,
                            ingestionStep: true,
                        },
                    },
                },
            },
        },
    });

    if (!chat) {
        throw new ApiError(404, "Chat not found or unauthorized");
    }

    // Transform the response to flatten document structure
    const response = {
        id: chat.id,
        title: chat.title,
        chatStatus: chat.chatStatus,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        documents: chat.documents.map((cd: { document: { id: string; documentName: string; storagePath: string; documentStatus: string; ingestionStep: string } }) => cd.document),
    };

    res.json(new ApiResponse(200, response, "Chat fetched successfully"));
});


/**
 * Get Messages for Chat
 * Priority: P1 - Critical
 * 
 * Returns all messages for a specific chat
 * Messages sorted by createdAt (oldest first for chat flow)
 */
const getChatMessages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!chatId || Array.isArray(chatId)) {
        throw new ApiError(400, "Valid Chat ID is required");
    }

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
        where: {
            id: chatId,
            userId: userId,
        },
    });

    if (!chat) {
        throw new ApiError(404, "Chat not found or unauthorized");
    }

    // Get messages for this chat
    const messages = await prisma.message.findMany({
        where: {
            chatId: chatId,
        },
        orderBy: {
            createdAt: 'asc',
        },
        select: {
            id: true,
            chatId: true,
            content: true,
            role: true,
            createdAt: true,
        },
    });

    res.json(new ApiResponse(200, messages, "Messages fetched successfully"));
});


const createChat = asyncHandler( async (req: Request, res: Response, next:NextFunction) => {
    console.log('chat controller reached')

    const { chatName } = req.body

    const parsedChatName = ChatCreateSchema.safeParse({
        title: chatName
    })

    if(!parsedChatName.success) {
        const errorMessages = parsedChatName.error.issues.map(issue => issue.message)
        throw new ApiError(404,"chat name validation failed", errorMessages)
    }

    if(!req.user?.id) {
        throw new ApiError(404, 'unauthorized, userId not found in createChat controller')
    }

    // create db entry for chat creation

    const createChatDb = await prisma.chat.create({
        data: {
            title: chatName,
            userId: req.user.id
        }
    })

    if(!createChatDb) {
        console.log('chat db entry not created in createChat controller')
        throw new ApiError(500, 'chat db entry not created in createChat controller')
    }

    res.json(new ApiResponse(200, createChatDb, 'chat created successfully'))

})

/**
 * Update Chat Name
 * Priority: P2 - Important
 */
const updateChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { chatId } = req.params;
    const { chatName } = req.body;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!chatId || Array.isArray(chatId)) {
        throw new ApiError(400, "Valid Chat ID is required");
    }

    const parsedChatName = ChatCreateSchema.safeParse({
        title: chatName,
    });

    if (!parsedChatName.success) {
        const errorMessages = parsedChatName.error.issues.map((issue) => issue.message);
        throw new ApiError(400, "chat name validation failed", errorMessages);
    }

    const chat = await prisma.chat.findFirst({
        where: {
            id: chatId,
            userId,
        },
    });

    if (!chat) {
        throw new ApiError(404, "Chat not found or unauthorized");
    }

    const updatedChat = await prisma.chat.update({
        where: {
            id: chatId,
        },
        data: {
            title: parsedChatName.data.title,
        },
    });

    res.json(new ApiResponse(200, updatedChat, "Chat updated successfully"));
});


/**
 * Delete Chat
 * Priority: P2 - Important
 * 
 * Deletes a chat and its messages
 * First deletes all messages, then removes chat-document relations, then deletes chat
 */
const deleteChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!chatId || Array.isArray(chatId)) {
        throw new ApiError(400, "Valid Chat ID is required");
    }

    // Verify chat belongs to user before deletion
    const chat = await prisma.chat.findFirst({
        where: {
            id: chatId,
            userId: userId,
        },
    });

    if (!chat) {
        throw new ApiError(404, "Chat not found or unauthorized");
    }

    // Delete messages first (since Message doesn't have cascade delete)
    await prisma.message.deleteMany({
        where: { chatId },
    });

    // Delete ChatDocument relations
    await prisma.chatDocument.deleteMany({
        where: { chatId },
    });

    // Now delete the chat
    await prisma.chat.delete({
        where: {
            id: chatId,
        },
    });

    res.json(new ApiResponse(200, {}, "Chat deleted successfully"));
})


export { createChat, getAllChats, getChatById, getChatMessages, updateChat, deleteChat }
