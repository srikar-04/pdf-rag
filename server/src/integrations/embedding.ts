import { IngestionStep } from "../generated/prisma/enums.js"
import IngestionResponse from "../utils/ingestionResponse.js"
import { geminiEmbeddingClient } from "../lib/gemini.js"
import IngestionError from "../utils/ingestionError.js"


export const embedding = async (rawChunks: string[]) => {
    

    try {
        const embeddingResponse = await geminiEmbeddingClient(rawChunks)
    
        const embeddingsAndIndex = embeddingResponse.map(item => ({
            index: item.index,
            embedding: item.embedding
        }))

        return (new IngestionResponse(IngestionStep.embedded, embeddingsAndIndex, 'embedded chunks of data'))

    } catch (error) {
        console.log('error while embedding : ', error)
        throw new IngestionError(IngestionStep.chunked, 'failed to embbed chunks')
    }

}