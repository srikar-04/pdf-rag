import type { TextResult } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import crypto from 'crypto'
import { EmbeddingStatus, IngestionStep } from "../generated/prisma/enums.js";
import IngestionError from "../utils/ingestionError.js";
import IngestionResponse from "../utils/ingestionResponse.js";


export type ChunkInfoType = {
    chunkHash: string,
    chunkIndex: number,
    contentLength: number,
    embeddingStatus: EmbeddingStatus
}

export const chunking = async ({normalizedText, chunkSize, chunkOverlap}: {
    normalizedText: string,
    chunkSize: number,
    chunkOverlap: number
}) => {

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap
    })


    const rawChunks = await splitter.splitText(normalizedText)

    const chunkInfo: Array<ChunkInfoType>  = []

    rawChunks.map((chunk, index) => {

        const chunkHash = crypto.createHash("sha256").update(chunk).digest("hex")

        chunkInfo.push({
            chunkHash: chunkHash,
            chunkIndex: index,
            contentLength: chunk.length,
            embeddingStatus: EmbeddingStatus.none
        })
    })

    if(!chunkInfo || chunkInfo.length === 0) {
        throw new IngestionError(IngestionStep.normalized, "")
    }

    return (new IngestionResponse(IngestionStep.chunked, {rawChunks, chunkInfo}, 'succesfully chunked normalized text'))
}