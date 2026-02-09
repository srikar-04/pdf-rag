import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DocumentUploadSchema } from "../schemas/document.schema.js";
import ApiError from "../utils/apiError.js";
import { deleteLocalFile } from "../utils/uploadToImagekit.js";


export const validatePdfUpload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const file = req.file

    if(!file) {
        throw new ApiError(400, "No file uploaded")
    }

    const fileDetails = {
        fileSize: file.size,
        fileType: file.mimetype
    }

    const parsedFileDetails = DocumentUploadSchema.safeParse(fileDetails)

    if (!parsedFileDetails.success) {
        const errorMessages = parsedFileDetails.error.issues.map(issue => issue.message)
        deleteLocalFile(file)
        throw new ApiError(413, 'File validation failed', errorMessages)
    }

    next()
})