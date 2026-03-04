import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { prisma } from "../lib/prisma.js";
import axios from "axios";
import { queryRetrieval, type RetrievalResponse } from "../helpers/retrieval.js";
import { geminiClient } from "../lib/gemini.js";
import { env } from "../config/env.schema.js";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import ApiResponse from "../utils/apiResponse.js";
import type { Role } from "../generated/prisma/enums.js";


// type MessagesType = ChatCompletionMessageParam[] extends {role: Role, content: any}

export const query = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    const chatId = req.params.chatId as string
    const user = req.user
    const documentId = req.params.documentId as string
    const query = req.body.content  // Fixed: was req.body.query, should be req.body.content

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

    if (chatDB?.userId !== user.id) {
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

    // 2) embed query AND fetch chat history in parallel (independent operations)
    const [queryEmbeddings, lastMessages] = await Promise.all([
        // Embed query using Ollama
        axios.post(`${env.OLLAMA_BASE_URL}/api/embeddings`, {
            model: env.EMBEDDING_MODEL,
            prompt: query,
        }, { timeout: 30000 }),
        
        // Fetch chat history (already in chronological order)
        prisma.message.findMany({
            where: { chatId: chatId as string },
            orderBy: { createdAt: "asc" }, // Fetch in chronological order directly
            take: 8
        }),
    ]);

    if (!queryEmbeddings.data) throw new ApiError(400, 'unable to embed user query')

    console.log(`☑️ embedded user query and fetched chat history (parallel)\n`)

    let userId = user.id
    let embeddings = queryEmbeddings.data.embedding as number[]

    // 3) send embedded query to retrieval function
    const retrievalResponse: RetrievalResponse = await queryRetrieval({ embeddings, userId, documentId })

    console.log(`☑️ retrieved context for user query \n`)

    // 4) Format chat history for the LLM (already in chronological order)
    const chatHistory = lastMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
    }));

    const formattedHistory = chatHistory
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n')

    console.log(`☑️ fetched ${chatHistory.length} previous messages for context \n`);

    const systemPrompt = `
    
    You are an intelligent ai assistnat specialized in answering user questions by reasoning on available context and relevant chat history
    
    using the provided document context and relevant chat histroy, answer user's questions in clear, detailed and well structured manner

    Rules:
    - Provide a complete explanation.
    - Connect related ideas across different parts of the context.
    - If the context allows, expand on implications or relationships.
    - Do not answer questions which are not related to document's context or chat history. This is very important
    

    IMPORTANT :
    Always explain the reasoning clearly.
    Structure your answer in paragraphs.
    If information is missing, explicitly state that the document does not provide it.

    The relevant context of for the question is delemented in triple qoutes below. Read it carefully and answer user question with proper first principle reasoning 

    """${retrievalResponse.context}"""

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
        messages,
        reasoning_effort: "medium",
        temperature: 0.4,
        max_completion_tokens: 800
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