import { prisma } from "../lib/prisma.js";
import { pdfLoader } from "../integrations/pdfLoader.js";
import type { Document } from "../generated/prisma/client.js";
import IngestionError from "../utils/ingestionError.js";
import { IngestionStep } from "../generated/prisma/client.js";
import type { InfoResult, TextResult } from "pdf-parse";
import { chunking, type ChunkInfoType } from "../integrations/chunking.js";
import { normalizeText } from "../integrations/normalize.js";
import { embedding } from "../integrations/embedding.js";
import { upserting } from "../integrations/upserting.js";

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

        console.log(`\n ✅ loaded pdf \n `)

        await prisma.document.update({
            where: { id: docDetails.id },
            data: { ingestionStep: pdfLoaderResponse.ingestionStep }
        })

        // adding metadata for doc -> will get to this in upserting layer
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

        if(!normalizedText || normalizedText.length === 0) {
            throw new IngestionError(IngestionStep.fetched, 'cannot normalize text')
        }

        console.log(`\n ✅ normalized text \n `)

        await prisma.document.update({
            where: {
                id: docDetails.id
            },
            data: {
                ingestionStep: "normalized"
            }
        })

        // 3) chunking
        const chunkingResponse  = await chunking({
            normalizedText,
            chunkSize: 800,
            chunkOverlap: 150
        })

        const {rawChunks, chunkInfo}: {
            rawChunks: string[],
            chunkInfo: Array<ChunkInfoType>
        } = chunkingResponse.data

        if(!chunkInfo || chunkInfo.length === 0) {
            throw new IngestionError(IngestionStep.normalized, 'failed to fetch chunk result')
        }

        console.log(`\n ✅ chunked normalized text \n `)

        // updating chunkHash table
        await prisma.chunkHash.createMany({
            data: chunkInfo.map( (chunk) => ({
                documentId: docDetails.id,
                chunkHash: chunk.chunkHash,
                chunkIndex: chunk.chunkIndex,
                contentLenght: chunk.contentLength,
                embeddingStatus: chunk.embeddingStatus
            })),
            skipDuplicates: true
        })

        // updating docstatus in document table

        await prisma.document.update({
            where: {id: docDetails.id},
            data: {
                ingestionStep: chunkingResponse.ingestionStep
            }
        })


        // 4) embedding

        const embeddingResponse = await embedding(rawChunks)

        if(!embeddingResponse || !embeddingResponse.data) {
            throw new IngestionError(IngestionStep.chunked, 'failed to embed document')
        }

        const embeddingsAndIndex: {
            index: number;
            embedding: number[];
        }[] = embeddingResponse.data

        console.log(`\n ✅ embedded chunks \n `)

        // updating doc status
        await prisma.document.update({
            where: {
                id: docDetails.id
            },
            data: {
                ingestionStep: embeddingResponse.ingestionStep
            }
        })

        // updating chunkHash table

        await prisma.chunkHash.updateMany({
            where: {
                documentId: docDetails.id,
                chunkIndex: {
                    in: embeddingsAndIndex.map(item => item.index)
                }
            },
            data: {
                embeddingStatus: "ready"
            }
        })

        // 5) upserting to qdrant

        const upsertingResponse = await upserting({embeddingsAndIndex, rawChunks, chunkInfo, docDetails})

        console.log(`\n ✅ upserted into qdrant \n `)

        await prisma.document.update({
            where: {id: docDetails.id},
            data: {
                ingestionStep: upsertingResponse.ingestionStep,
                documentStatus: "ready"
            }
        })

    } catch (error) {
        console.error('error in ingestion pipeline : ', error)

        if (error instanceof IngestionError) {
            
            await prisma.document.update({
                where: { id: docDetails.id },
                data: {
                    documentStatus: "failed",
                    ingestionStep: error.ingestionStep
                }
            })
        }
    }

}

export { documentIngestionService }