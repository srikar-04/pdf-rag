import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import crypto from 'crypto'
import fs from 'fs'
import ImageKit from "@imagekit/nodejs";
import { deleteLocalFile, uploadToImagekit } from "../utils/uploadToImagekit.js";
import type { Document } from "../generated/prisma/client.js";
import ApiResponse from "../utils/apiResponse.js";
import { prisma } from "../lib/prisma.js";
import { documentIngestionService } from "../services/documentIngestion.service.js";
import { ChatCreateSchema } from "../schemas/chat.schema.js";

const SCANNED_PDF_FAILURE_REASON =
    "No extractable text was found. This looks like a scanned/image-only PDF. OCR is not supported yet, so please upload a text-based PDF.";
const EMBEDDING_FAILURE_REASON =
    "Document embedding failed due to a server configuration issue (vector dimension mismatch). Please retry in a few minutes.";
const GENERIC_PIPELINE_FAILURE_REASON =
    "Document processing failed due to a temporary server issue. Please retry your upload.";

const getFailureReason = (status: string, step: string) => {
    if (status !== "failed") return undefined;
    if (step === "fetched") return SCANNED_PDF_FAILURE_REASON;
    if (step === "embedded") return EMBEDDING_FAILURE_REASON;
    return GENERIC_PIPELINE_FAILURE_REASON;
};


export const documentUpload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const userId  = req.user?.id
    const file = req.file
    const chatId = req.params.chatId

    if(!file) {
        throw new ApiError(400, "No file uploaded")
    }

    if(!userId) {
        console.log('\n \n req.user: ', req.user)
        deleteLocalFile(file)
        throw new ApiError(401, "Unauthorized, userId not found")
    }

    if(!chatId) {
        deleteLocalFile(file)
        throw new ApiError(400, "No chat id provided")
    }

    const chat = await prisma.chat.findUnique({
        where: {
            id: chatId as string
        }
    })

    if(!chat) {
        deleteLocalFile(file)
        throw new ApiError(404, "chat not found")
    }

    const chatUserId = chat.userId

    if(chatUserId !== userId) {
        deleteLocalFile(file)
        throw new ApiError(401, "Unauthorized, user id does not match")
    }

    // generate hash for the file and log it
    const fileBuffer = await fs.promises.readFile(file.path)
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log('file hash: ', fileHash)

    // change file name with hash and user id
    const filename = `${userId}_${fileHash}_${file.originalname}`
    console.log('\n filename: \n \n ', filename)

    // upload to imagekit.io
    // create entry in db
    // return response

    const imageKitResponse: ImageKit.FileUploadResponse | Document = await uploadToImagekit(file, fileHash, userId)

    console.log('\n \n Imagekit response / document response : ', imageKitResponse, '\n \n ')

    if("fileId" in imageKitResponse) {
        // response is defenitely from imagekit cause fileId is only present in the imagekit response

        deleteLocalFile(file)
    } else {
        console.log('response is the already existed document: ', imageKitResponse)

        if ((imageKitResponse as Document).userId !== userId) {
            throw new ApiError(403, 'Unauthorized existing document ownership mismatch')
        }

        // check if there is already a relation between the same chatId and same document

        const duplicateChatDocumentEntryCheck = await prisma.chatDocument.findUnique({
            where: {
                chatId_documentId: {
                    chatId: chatId as string,
                    documentId: (imageKitResponse as Document).id
                }
            }
        })

        if(duplicateChatDocumentEntryCheck) {
            console.log('duplicate chat document entry check in document upload controller')
            throw new ApiError(400, 'document already exists')
        }

        // adding the chatId and document relation

        const chatDocumentEntry = await prisma.chatDocument.create({
            data: {
                chatId: chatId as string,
                documentId: (imageKitResponse as Document).id
            }
        })

        if(!chatDocumentEntry) {
            console.log('chat document entry not created in document upload controller')
            throw new ApiError(500, 'chat document entry not created in document upload controller')
        }

        return res.json(new ApiResponse(200, {imageKitResponse, chatDocumentEntry}, 'existing document added to this chat'))
    }

// create a new db entry


    if(!imageKitResponse.url) {
        console.log('imagekit response : ', imageKitResponse)
        deleteLocalFile(file)
        throw new ApiError(500, 'imagekit response url not found')
    }
    
    // also entering chatId details for a new document upload
    const documentEntry = await prisma.document.create({
        data: {
            documentName: filename,
            documentHash: fileHash,
            documentStatus: "processing",
            storagePath: imageKitResponse.url,
            userId: userId,
            chats: {
                create: {
                    chat: {
                        connect: {
                            id: chatId as string
                        }
                    }
                }
            }
        }
    })

    if(!documentEntry) {
        console.log('document entry not created in document upload controller')
        throw new ApiError(500, 'document entry not created in document upload controller')
    }

    // update chat status to active

    const updateChatStatus = await prisma.chat.update({
        where: {
            id: chatId as string
        },
        data: {
            chatStatus: "active"
        }
    })

    if(!updateChatStatus) {
        console.log('chat status not updated in document upload controller')
        throw new ApiError(500, 'chat status not updated in document upload controller')
    }

    res.json(new ApiResponse(200, {imageKitResponse, documentEntry}, 'file uploaded successfully'))

})


export const ingestDocument = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    // validate document here and move the control to document ingestion service
    // -> userId is equl to session userid or not
    // -> is atleast linked to one chatId or not
    

    // do not wait for the service to complete, just return the response
    // ingestion service can take a hell lot of time

    const {documentId} = req.params

    if(!documentId) {
        throw new ApiError(400, 'cannot get documentId in ingestDocument controller')
    }

    const userId = req.user?.id

    if(!userId) {
        throw new ApiError(401, 'Unauthorized, userId not found in ingestDocument controller')
    }

    // check if the document is present or not

    const existingDoc = await prisma.document.findUnique({
        where: {
            id: documentId as string
        },
        include: {
            _count: {
                select: {
                    chats: true,
                    chunks: true
                }
            }
        }
    })

    if(!existingDoc) {
        throw new ApiError(404, 'cannot find document with particular doc id')
    }

    if(existingDoc.userId !== userId) {
        throw new ApiError(401, 'cannot fetch doc for this user')
    }

    if(existingDoc._count.chats === 0) {
        throw new ApiError(400, 'document is not linked to any chat')
    }

    if(existingDoc._count.chunks !== 0 && existingDoc.documentStatus === "ready") {
        return res.json(new ApiResponse(201, existingDoc, 'document is already ingested'))
    }

    // call document ingestion service

    documentIngestionService(existingDoc)

    return res.json(new ApiResponse(200, null, 'started document ingestion in background'))

})

export const documentStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const documentId = req.params.documentId

    if(!documentId) throw new ApiError(404, 'document id not found in document status controller')

    // get document details from db

    const docDB = await prisma.document.findUnique({
        where: {
            id: documentId as string
        },
        select: {
            documentStatus: true,
            ingestionStep: true,
            id: true,
            userId: true,

        }
    })


    if(!docDB) {
        throw new ApiError(404, 'doc not found in db from doc status handler')
    }

    const user = req.user

    if(!user) {
        throw new ApiError(401, 'un authenticated user from doc status handler')
    }

    if(user.id !== docDB.userId) {
        throw new ApiError(403, 'user id does not match in doc status handler')
    }

    const failureReason = getFailureReason(docDB.documentStatus, docDB.ingestionStep);

    res.json(
        new ApiResponse(
            201,
            {
                ...docDB,
                failureReason
            },
            'successfully fetched doc status details'
        )
    )

})


/**
 * Get All Documents
 * Priority: P1 - Critical
 * 
 * Lists all documents for the current authenticated user
 * Returns documents sorted by createdAt (most recent first)
 */
export const getAllDocuments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    const documents = await prisma.document.findMany({
        where: {
            userId: userId,
        },
        select: {
            id: true,
            documentName: true,
            storagePath: true,
            documentStatus: true,
            ingestionStep: true,
            documentHash: true,
            documentMetadata: {
                select: {
                    createdAt: true,
                },
            },
        },
    });

    const normalizedDocuments = documents
        .map((doc) => ({
            id: doc.id,
            documentName: doc.documentName,
            storagePath: doc.storagePath,
            documentStatus: doc.documentStatus,
            ingestionStep: doc.ingestionStep,
            documentHash: doc.documentHash,
            createdAt: doc.documentMetadata?.createdAt,
        }))
        .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });

    res.json(new ApiResponse(200, normalizedDocuments, "Documents fetched successfully"));
})


/**
 * Delete Document
 * Priority: P2 - Important
 * 
 * Deletes a document and all associated data
 * This will cascade delete: ChunkHash, ChatDocument relations, DocumentMetadata
 */
export const deleteDocument = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { documentId } = req.params;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!documentId || Array.isArray(documentId)) {
        throw new ApiError(400, "Valid Document ID is required");
    }

    // Verify document belongs to user before deletion
    const document = await prisma.document.findFirst({
        where: {
            id: documentId,
            userId: userId,
        },
    });

    if (!document) {
        throw new ApiError(404, "Document not found or unauthorized");
    }

    const linkedChats = await prisma.chatDocument.findMany({
        where: { documentId },
        select: { chatId: true },
    });

    const linkedChatIds = [...new Set(linkedChats.map((entry) => entry.chatId))];

    await prisma.$transaction(async (tx) => {
        // Remove relations first to avoid FK violations.
        await tx.chatDocument.deleteMany({
            where: { documentId },
        });

        // Cleanup child records explicitly for reliability.
        await tx.chunkHash.deleteMany({
            where: { documentId },
        });

        await tx.documentMetadata.deleteMany({
            where: { documentId },
        });

        await tx.document.delete({
            where: {
                id: documentId,
            },
        });
    });

    // If any linked chat has no more docs, mark it empty.
    await Promise.all(
        linkedChatIds.map(async (chatId) => {
            const remainingDocuments = await prisma.chatDocument.count({
                where: { chatId },
            });

            if (remainingDocuments === 0) {
                await prisma.chat.update({
                    where: { id: chatId },
                    data: { chatStatus: "empty" },
                });
            }
        })
    );

    res.json(new ApiResponse(200, {}, "Document deleted successfully"));
})

/**
 * Get Chats Where Document Can Be Linked
 * Returns user chats excluding chats already linked with this document.
 */
export const getAvailableChatsForDocument = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { documentId } = req.params;

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!documentId || Array.isArray(documentId)) {
        throw new ApiError(400, "Valid Document ID is required");
    }

    const document = await prisma.document.findFirst({
        where: {
            id: documentId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!document) {
        throw new ApiError(404, "Document not found or unauthorized");
    }

    const linkedRelations = await prisma.chatDocument.findMany({
        where: { documentId },
        select: { chatId: true },
    });

    const linkedChatIds = linkedRelations.map((entry) => entry.chatId);

    const chats = await prisma.chat.findMany({
        where: {
            userId,
            ...(linkedChatIds.length > 0 ? { id: { notIn: linkedChatIds } } : {}),
        },
        orderBy: {
            updatedAt: "desc",
        },
        select: {
            id: true,
            title: true,
            chatStatus: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    res.json(new ApiResponse(200, chats, "Available chats fetched successfully"));
});

/**
 * Link Document To Existing Chat
 */
export const linkDocumentToChat = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { documentId } = req.params;
    const { chatId } = req.body as { chatId?: string };

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!documentId || Array.isArray(documentId)) {
        throw new ApiError(400, "Valid Document ID is required");
    }

    if (!chatId || typeof chatId !== "string") {
        throw new ApiError(400, "Valid Chat ID is required");
    }

    const [document, chat] = await Promise.all([
        prisma.document.findFirst({
            where: { id: documentId, userId },
            select: { id: true },
        }),
        prisma.chat.findFirst({
            where: { id: chatId, userId },
            select: { id: true, title: true, chatStatus: true, createdAt: true, updatedAt: true },
        }),
    ]);

    if (!document) {
        throw new ApiError(404, "Document not found or unauthorized");
    }

    if (!chat) {
        throw new ApiError(404, "Chat not found or unauthorized");
    }

    const existingRelation = await prisma.chatDocument.findUnique({
        where: {
            chatId_documentId: {
                chatId,
                documentId,
            },
        },
    });

    if (existingRelation) {
        throw new ApiError(409, "Document already linked to this chat");
    }

    await prisma.$transaction(async (tx) => {
        await tx.chatDocument.create({
            data: {
                chatId,
                documentId,
            },
        });

        await tx.chat.update({
            where: { id: chatId },
            data: { chatStatus: "active" },
        });
    });

    const updatedChat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
            id: true,
            title: true,
            chatStatus: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    res.json(new ApiResponse(200, updatedChat, "Document linked to chat successfully"));
});

/**
 * Create New Chat And Link Document
 */
export const createChatAndLinkDocument = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { documentId } = req.params;
    const { chatName } = req.body as { chatName?: string };

    if (!userId) {
        throw new ApiError(401, "Unauthorized, userId not found");
    }

    if (!documentId || Array.isArray(documentId)) {
        throw new ApiError(400, "Valid Document ID is required");
    }

    const parsedChatName = ChatCreateSchema.safeParse({
        title: chatName,
    });

    if (!parsedChatName.success) {
        const errorMessages = parsedChatName.error.issues.map((issue) => issue.message);
        throw new ApiError(400, "Chat name validation failed", errorMessages);
    }

    const document = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { id: true },
    });

    if (!document) {
        throw new ApiError(404, "Document not found or unauthorized");
    }

    const newChat = await prisma.chat.create({
        data: {
            title: parsedChatName.data.title,
            userId,
            chatStatus: "active",
            documents: {
                create: {
                    document: {
                        connect: {
                            id: documentId,
                        },
                    },
                },
            },
        },
        select: {
            id: true,
            title: true,
            chatStatus: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    res.json(new ApiResponse(200, newChat, "New chat created and document linked successfully"));
});
