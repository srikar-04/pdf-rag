import { prisma } from "../lib/prisma.js";
import { pdfLoader } from "../integrations/pdfLoader.js";
import type { Document } from "../generated/prisma/client.js";
import IngestionError from "../utils/ingestionError.js";
import { IngestionStep } from "../generated/prisma/client.js";
import type { InfoResult, TextResult } from "pdf-parse";
import { chunking } from "../integrations/chunking.js";
import { normalize } from "node:path";
import { normalizeText } from "../integrations/normalize.js";

const documentIngestionService = async (docDetails: Document) => {

    try {
        // Set status to Ingesting when starting
        await prisma.document.update({
            where: { id: docDetails.id },
            data: { documentStatus: "Ingesting" }
        })

        // 1. pdf loading
        const pdfLoaderResponse = await pdfLoader(docDetails)

        if(!(pdfLoaderResponse.data.result as TextResult).text && (pdfLoaderResponse.data.result as TextResult).text.length === 0) {
            throw new IngestionError(IngestionStep.none, 'cannot get loaded pdf text')
        }

        await prisma.document.update({
            where: { id: docDetails.id },
            data: { ingestionStep: pdfLoaderResponse.ingestionStep }
        })

        // adding metadata for doc
        const metadata = pdfLoaderResponse.data.metadata as InfoResult

        const metadataDB = await prisma.documentMetadata.create({
            data: {
                pages: metadata.total,
                title: metadata.info?.Title,
                author: metadata.info?.Author,
                creator: metadata.info?.Creator,
                producer: metadata.info?.Producer,
                documentId: docDetails.id
            }
        })

        if(!metadataDB) console.warn('metadata not added for document with id : ', docDetails.id)


        // 2) normalizing text

        const normalizedText = normalizeText(pdfLoaderResponse.data.result as TextResult)

        // 3) chunking
        const chunkingResponse = await chunking(normalizedText)


        //  embed, upsert ...

        // Final update to ready
        await prisma.document.update({
            where: { id: docDetails.id },
            data: {
                documentStatus: "ready",
                ingestionStep: IngestionStep.upserted
            }
        })

    } catch (error) {
        console.error('error in ingestion pipeline : ', error)

        let failedStep: IngestionStep = IngestionStep.none;
        let errorMessage = "Ingestion failed";

        if (error instanceof IngestionError) {
            failedStep = error.ingestionStep;
            errorMessage = error.message;
        }

        await prisma.document.update({
            where: { id: docDetails.id },
            data: {
                documentStatus: "failed",
                ingestionStep: failedStep
            }
        })
    }

}

export { documentIngestionService }