import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { prisma } from "../lib/prisma.js";
import axios from "axios";


export const query = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    const chatId = req.params.chatId
    const user = req.user
    const documentId = req.params.documentId
    const query = req.body.query

    if (!user) throw new ApiError(404, 'un-authenticated user in query handler ')

    if (!chatId) throw new ApiError(404, 'chatId not found in query handler')

    if (!documentId) throw new ApiError(404, 'document id not found in query handler')

    if (!query) throw new ApiError(404, 'did not find user query')

    // 1) store query in database along with chatId and role as user

    const queryStorage = await prisma.message.create({
        data: {
            content: query,
            role: "user",
            chatId: chatId as string
        }
    })

    if (!queryStorage) throw new ApiError(404, 'failed to insert query into database')

    // 2) embbed query using ollama
    const queryEmbeddigns = await axios.post("http://localhost:11434/api/embeddings", {
        model: "nomic-embed-text",
        prompt: query,
    }, { timeout: 60000 });

    // send embedded query to retrieval function
    // get top results from the function

})