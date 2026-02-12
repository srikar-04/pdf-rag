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

    const imageKitResponse: ImageKit.FileUploadResponse | Document = await uploadToImagekit(file, fileHash)

    console.log('\n \n Imagekit response / document response : ', imageKitResponse, '\n \n ')

    if("fileId" in imageKitResponse) {
        // response is defenitely from imagekit cause fileId is only present in the imagekit response

        deleteLocalFile(file)
    } else {
        console.log('response is the already existed document: ', imageKitResponse)

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