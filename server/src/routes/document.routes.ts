import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { validatePdfUpload } from "../middlewares/pdfValidation.middleware.js";
import { documentUpload, ingestDocument } from "../controllers/document.controller.js";

const router = Router()

router
    .route('/upload/:chatId')
    .post(
        authMiddleware,
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

    // deleting document


export default router