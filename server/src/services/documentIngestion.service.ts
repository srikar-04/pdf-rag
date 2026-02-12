import { prisma } from "../lib/prisma.js";
import { pdfLoader } from "../integrations/pdfLoader.js";
import type { Document } from "../generated/prisma/client.js";
import IngestionError from "../utils/ingestionError.js";
import { IngestionStep } from "../generated/prisma/client.js";
import type { TextResult } from "pdf-parse";

const documentIngestionService = async (docDetails: Document) => {

    try {
        // Set status to Ingesting when starting
        await prisma.document.update({
            where: { id: docDetails.id },
            data: { documentStatus: "Ingesting" }
        })

        // 1. Fetch doc details and extract text
        const pdfLoaderResponse = await pdfLoader(docDetails)

        if(!(pdfLoaderResponse.data as TextResult).text && (pdfLoaderResponse.data as TextResult).text.length === 0) {
            throw new IngestionError(IngestionStep.none, 'cannot get loaded pdf text')
        }

        await prisma.document.update({
            where: { id: docDetails.id },
            data: { ingestionStep: pdfLoaderResponse.ingestionStep }
        })

        // ... normalize, chunk, embed, upsert ...

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