import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ChatCreateSchema } from "../schemas/chat.schema.js";
import { prisma } from "../lib/prisma.js";
import ApiResponse from "../utils/apiResponse.js";


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

export { createChat }