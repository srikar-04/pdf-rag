import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { prisma } from "../lib/prisma.js";
import { queryRetrieval, type RetrievalResponse } from "../helpers/retrieval.js";
import { geminiClient } from "../lib/gemini.js";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import ApiResponse from "../utils/apiResponse.js";
import type { Role } from "../generated/prisma/enums.js";
import { generateEmbeddings } from "../lib/cloudflareEmbeddings.js";


// type MessagesType = ChatCompletionMessageParam[] extends {role: Role, content: any}
const LLM_MODEL = "models/gemini-2.5-flash";
const LLM_MAX_OUTPUT_TOKENS = 1600;
const MAX_CONTINUATION_ATTEMPTS = 2;
const MAX_CONTEXT_CHARS = 18000;

const CONTINUATION_PROMPT =
    "Continue exactly from where you stopped. Do not repeat earlier sections. Keep the same structure and complete the remaining explanation.";

const isLengthStop = (reason: string | null | undefined): boolean =>
    reason === "length" || reason === "max_tokens";

const extractTextContent = (content: unknown): string => {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";

    return content
        .map((part) => {
            if (typeof part === "string") return part;
            if (part && typeof part === "object" && "text" in part) {
                return String((part as { text?: unknown }).text ?? "");
            }
            return "";
        })
        .join("")
        .trim();
};

const callAssistant = async (messages: ChatCompletionMessageParam[]) => {
    const response = await geminiClient.chat.completions.create({
        model: LLM_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: LLM_MAX_OUTPUT_TOKENS,
    });

    const choice = response.choices?.[0];
    return {
        choice,
        content: extractTextContent(choice?.message?.content),
        finishReason: choice?.finish_reason,
        usage: response.usage,
    };
};

export const query = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    const chatId = req.params.chatId as string
    const user = req.user
    const documentId = req.params.documentId as string
    const query = req.body.content  // Fixed: was req.body.query, should be req.body.content

    if (!user) throw new ApiError(404, 'un-authenticated user in query handler ')

    if (!chatId) throw new ApiError(404, 'chatId not found in query handler')

    if (!documentId) throw new ApiError(404, 'document id not found in query handler')

    if (!query) throw new ApiError(404, 'did not find user query')

    const chatDB = await prisma.chat.findUnique({
        where: {
            id: chatId
        }
    })

    if (chatDB?.userId !== user.id) {
        throw new ApiError(403, "chat user id did not match, un authenticated user")
    }

    let targetDocumentIds: string[] = [];
    if (documentId === "all") {
        const chatDocuments = await prisma.chatDocument.findMany({
            where: { chatId },
            include: {
                document: {
                    select: {
                        id: true,
                        userId: true,
                        documentStatus: true,
                    },
                },
            },
        });

        if (!chatDocuments.length) {
            throw new ApiError(404, "No documents linked to this chat");
        }

        const readyOwnedDocs = chatDocuments
            .map((entry) => entry.document)
            .filter((doc) => doc.userId === user.id && doc.documentStatus === "ready");

        if (!readyOwnedDocs.length) {
            throw new ApiError(
                409,
                "No ready documents found in this chat. Wait for ingestion to complete before querying."
            );
        }

        targetDocumentIds = readyOwnedDocs.map((doc) => doc.id);
    } else {
        const documentDB = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                userId: true,
                documentStatus: true,
            }
        })

        if (!documentDB) {
            throw new ApiError(404, "Document not found")
        }

        if (documentDB.userId !== user.id) {
            throw new ApiError(403, "Unauthorized document access")
        }

        if (documentDB.documentStatus !== "ready") {
            throw new ApiError(
                409,
                "Document is not ready for querying. If this is a scanned/image-only PDF, OCR is not supported yet."
            )
        }

        const relation = await prisma.chatDocument.findUnique({
            where: {
                chatId_documentId: {
                    chatId,
                    documentId
                }
            }
        });

        if (!relation) throw new ApiError(403, "Document not linked to chat");
        targetDocumentIds = [documentId];
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
        // Embed query using Cloudflare Workers AI
        generateEmbeddings(query),
        
        // Fetch chat history (already in chronological order)
        prisma.message.findMany({
            where: { chatId: chatId as string },
            orderBy: { createdAt: "asc" }, // Fetch in chronological order directly
            take: 8
        }),
    ]);

    if (!queryEmbeddings || queryEmbeddings.length === 0 || !queryEmbeddings[0]) {
        throw new ApiError(400, 'unable to embed user query')
    }

    console.log(`☑️ embedded user query and fetched chat history (parallel)\n`)

    let userId = user.id
    let embeddings = queryEmbeddings[0]

    // 3) retrieve context from one or more linked ready documents
    const retrievalResults = await Promise.allSettled(
        targetDocumentIds.map((docId) => queryRetrieval({ embeddings, userId, documentId: docId }))
    );

    const retrievalResponses = retrievalResults
        .filter((result): result is PromiseFulfilledResult<RetrievalResponse> => result.status === "fulfilled")
        .map((result) => result.value);

    const failedRetrievalCount = retrievalResults.length - retrievalResponses.length;
    if (failedRetrievalCount > 0) {
        console.warn(`[Retrieval] ${failedRetrievalCount}/${retrievalResults.length} retrieval calls failed`);
    }

    if (!retrievalResponses.length) {
        throw new ApiError(
            502,
            "Failed to retrieve context from linked documents. Please try again in a moment."
        );
    }

    const aggregatedChunks = Array.from(
        new Set(
            retrievalResponses
                .flatMap((response) => response.chunks)
                .filter((chunk) => chunk && chunk.trim().length > 0)
        )
    );

    const boundedChunks: string[] = [];
    let contextChars = 0;
    for (const chunk of aggregatedChunks.slice(0, 20)) {
        const nextLen = chunk.length;
        if (contextChars + nextLen > MAX_CONTEXT_CHARS) break;
        boundedChunks.push(chunk);
        contextChars += nextLen;
    }

    const aggregatedContext = boundedChunks
        .map((chunk, index) => `Chunk ${index + 1}:\n${chunk}`)
        .join("\n\n---\n\n");

    const retrievalResponse: RetrievalResponse = {
        context: aggregatedContext,
        chunks: boundedChunks,
        found: boundedChunks.length > 0,
    };

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

    let firstResult: Awaited<ReturnType<typeof callAssistant>>;
    try {
        firstResult = await callAssistant(messages);
    } catch (error) {
        console.error("[LLM] initial generation failed:", error);
        throw new ApiError(502, "LLM generation failed. Please retry your question.");
    }

    if (!firstResult.choice) throw new ApiError(400, 'failed to get llm response')

    console.log(
        `[LLM] first pass finish_reason=${firstResult.finishReason ?? "unknown"} prompt_tokens=${firstResult.usage?.prompt_tokens ?? "n/a"} completion_tokens=${firstResult.usage?.completion_tokens ?? "n/a"}`
    );

    let resultContent = firstResult.content;
    let finishReason = firstResult.finishReason;
    let continuationAttempt = 0;

    while (isLengthStop(finishReason) && continuationAttempt < MAX_CONTINUATION_ATTEMPTS) {
        continuationAttempt += 1;

        const continuationMessages: ChatCompletionMessageParam[] = [
            ...messages,
            { role: "assistant", content: resultContent },
            { role: "user", content: CONTINUATION_PROMPT }
        ];

        const continuationResult = await callAssistant(continuationMessages);
        const nextChunk = continuationResult.content;
        if (!nextChunk) {
            console.warn(`[LLM] continuation attempt ${continuationAttempt} returned empty content`);
            break;
        }

        resultContent = `${resultContent}\n\n${nextChunk}`.trim();
        finishReason = continuationResult.finishReason;

        console.log(
            `[LLM] continuation #${continuationAttempt} finish_reason=${finishReason ?? "unknown"} completion_tokens=${continuationResult.usage?.completion_tokens ?? "n/a"}`
        );
    }

    if (!resultContent) throw new ApiError(400, 'model returned empty response');

    const result = {
        role: "assistant",
        content: resultContent
    };


    // appending the result to database

    await prisma.message.create({
        data: {
            role: "assistant",
            content: result.content,
            chatId: chatId
        }
    })

    return res.json(new ApiResponse(201, result, "successfully got llm response"))

})
