import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { prisma } from "../lib/prisma.js";
import axios from "axios";
import { queryRetrieval, type RetrievalResponse } from "../utils/retrieval.js";
import { geminiClient } from "../lib/gemini.js";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import ApiResponse from "../utils/apiResponse.js";
import type { Role } from "../generated/prisma/enums.js";


// type MessagesType = ChatCompletionMessageParam[] extends {role: Role, content: any}

export const query = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    const chatId = req.params.chatId as string
    const user = req.user
    const documentId = req.params.documentId as string
    const query = req.body.query

    if (!user) throw new ApiError(404, 'un-authenticated user in query handler ')

    if (!chatId) throw new ApiError(404, 'chatId not found in query handler')

    if (!documentId) throw new ApiError(404, 'document id not found in query handler')

    if (!query) throw new ApiError(404, 'did not find user query')

    const relation = await prisma.chatDocument.findUnique({
        where: {
            chatId_documentId: {
                chatId,
                documentId
            }
        }
    });

    if (!relation) throw new ApiError(403, "Document not linked to chat");

    const chatDB = await prisma.chat.findUnique({
        where: {
            id: chatId
        }
    })

    if(chatDB?.userId !== user.id) {
        throw new ApiError(401, "chat user id did not match, un authenticated user")
    }

    // 1) store query in database along with chatId and role as user

    const queryStorage = await prisma.message.create({
        data: {
            content: query,
            role: "user",
            chatId: chatId as string
        }
    })


    if (!queryStorage) throw new ApiError(404, 'failed to insert query into database')

    console.log(`☑️ updated db with user query \n`)

    // 2) embbed query using ollama
    const queryEmbeddings = await axios.post("http://localhost:11434/api/embeddings", {
        model: "nomic-embed-text",
        prompt: query,
    }, { timeout: 60000 })

    if (!queryEmbeddings.data) throw new ApiError(400, 'unable to embbed use query')

    console.log(`☑️ embedded user query \n`)

    let userId = user.id
    let embeddings = queryEmbeddings.data.embedding as number[]

    // 3) send embedded query to retrieval function
    const retrievalResponse: RetrievalResponse = await queryRetrieval({ embeddings, userId, documentId })

    console.log(`☑️ retrieved context for user query \n`)

    // 4) get chat history for last 8 messages
    const lastMessages = await prisma.message.findMany({
        where: { chatId: chatId as string },
        orderBy: { createdAt: "desc" },
        take: 8
    });

    // Format them for the LLM (Reverse to get chronological order)
    const chatHistory = lastMessages.reverse().map((msg) => ({
        role: msg.role,
        content: msg.content
    }));

    const formattedHistory = chatHistory
    .map(msg => `${msg.role.toUpperCase}: ${msg.content}`)
    .join('\n')

    console.log(`☑️ fetched ${chatHistory.length} previous messages for context \n`);

    const systemPrompt = `
    
    You are an intelligent ai assistnat specialized in answering user questions soley based on the "availble context", "previous chat history" and "user-query"

    the context for the question and chat history are delemented in triple qoutes below

    """context: ${retrievalResponse.context}"""
    """chat-history""": ${formattedHistory}
    """user-query""": ${query}

    strictly answer the question based on the available context and chat-history.
    If any question is out of context then just reply with "no context avilable for this topic" or whatever similar sentence you choose.

    `

    let messages: any = [
        {
            role: "system",
            content: systemPrompt
        },
        ...chatHistory,
        {
            role: 'user',
            content: query
        }
    ]

    const response = await geminiClient.chat.completions.create({
        model: "models/gemini-2.5-flash",
        messages
    })

    if (!response) throw new ApiError(400, 'failed to get llm response')

    let result = response.choices[0]?.message


    // appending the result to database

    await prisma.message.create({
        data: {
            role: "assistant",
            content: result?.content as string,
            chatId: chatId
        }
    })

    return res.json(new ApiResponse(201, result, "successfully got llm response"))

})