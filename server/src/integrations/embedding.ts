import { IngestionStep } from "../generated/prisma/enums.js"
import IngestionResponse from "../utils/ingestionResponse.js"
import { geminiEmbeddingClient } from "./gemini.js"


export const embedding = async (rawChunks: string[]) => {
    

    const embeddingResponse = await geminiEmbeddingClient(rawChunks)

    const embeddingsAndIndex = embeddingResponse.map(item => ({
        index: item.index,
        embedding: item.embedding
    }))

    return (new IngestionResponse(IngestionStep.embedded, embeddingsAndIndex, 'embedded chunks of data'))

}