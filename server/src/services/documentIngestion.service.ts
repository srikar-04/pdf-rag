import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

const documentIngestionService = async (documentId: string) => {

    try {

        // steps to be followed (already done with validation)

        // fetch doc details from cloud and extract text from it (using cloudinary url, load document)
        // if no text -> doc does not contain text, only images
        // normalize text
        // chunk doc
        // embedd document
        // upsert document

        
    } catch (error) {
        // handle the thrown error here

        console.error('error in ingestion pipeline : ', error)

        await prisma.document.update({
            where: {
                id: documentId
            },
            data: {
                documentStatus: "failed",
                // will add ingestion step later
            }
        })
    }

}

export {documentIngestionService}