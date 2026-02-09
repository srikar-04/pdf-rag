import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { validatePdfUpload } from "../middlewares/pdfValidation.middleware.js";
import { documentUpload } from "../controllers/document.controller.js";

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

export default router