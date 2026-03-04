import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadLimiter } from "../middlewares/rateLimit.middleware.js";
import { validatePdfUpload } from "../middlewares/pdfValidation.middleware.js";
import {
    documentUpload,
    ingestDocument,
    documentStatus,
    getAllDocuments,
    deleteDocument,
    getAvailableChatsForDocument,
    linkDocumentToChat,
    createChatAndLinkDocument
} from "../controllers/document.controller.js";

const router = Router()

// Get all documents for current user (Priority: P1)
router.route('/').get(
    authMiddleware,
    getAllDocuments
)

router
    .route('/upload/:chatId')
    .post(
        authMiddleware,
        uploadLimiter, // Rate limit: 5 uploads per hour
        // multer middleware
        upload.single('file'),
        // zod validation
        validatePdfUpload,
        // upload to imagekit.io
        documentUpload,
        // create entry in db
        // return response
    )

    // chunking doc (already linked to a particular chat)
    router.route('/ingest/:documentId').post(
        authMiddleware,
        ingestDocument
    )

    // polling for doc status

    router.route('/status/:documentId').get(
        authMiddleware,
        documentStatus
    )

    // Get chats where this document is not linked yet
    router.route('/:documentId/available-chats').get(
        authMiddleware,
        getAvailableChatsForDocument
    )

    // Link document to an existing chat
    router.route('/:documentId/link-chat').post(
        authMiddleware,
        linkDocumentToChat
    )

    // Create new chat and link document
    router.route('/:documentId/link-new-chat').post(
        authMiddleware,
        createChatAndLinkDocument
    )

    // Delete document (Priority: P2)
    router.route('/:documentId').delete(
        authMiddleware,
        deleteDocument
    )


export default router
