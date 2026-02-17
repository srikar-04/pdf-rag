import { IngestionStep } from "../generated/prisma/enums.js"
import IngestionResponse from "../utils/ingestionResponse.js"
import { geminiEmbeddingClient } from "../lib/gemini.js"
import IngestionError from "../utils/ingestionError.js"
import axios from "axios"


export const embedding = async (rawChunks: string[]) => {

    // try {

    //     let counter = 0

    //     let BATCH_SIZE = 100;
    //     let embeddingsAndIndex: {
    //         index: number,
    //         embedding: number[]
    //     }[] = []

    //     for(let i = 0; i < rawChunks.length; i+=BATCH_SIZE) {
    //         process.stdout.write(counter.toString() )
    //         counter++

    //         const batch = rawChunks.slice(i, i+BATCH_SIZE)

    //         const embeddingResponse = await geminiEmbeddingClient(batch)

    //         embeddingResponse.forEach((item, index) => {
    //             embeddingsAndIndex.push({
    //                 index: i + index,
    //                 embedding: item.embedding
    //             })
    //         })

    //         await new Promise(res => setTimeout(res, 8000))
    //     }

    //     return (new IngestionResponse(IngestionStep.embedded, embeddingsAndIndex, 'embedded chunks of data'))

    // } catch (error) {
    //     console.log('error while embedding : ', error)
    //     throw new IngestionError(IngestionStep.chunked, 'failed to embbed chunks')
    // }

    // 


    // embedding using ollama

    try {

        const promises = rawChunks.map(chunk =>
            axios.post("http://localhost:11434/api/embeddings", {
                model: "nomic-embed-text",
                prompt: chunk,
            }, {timeout: 40000}),
        );

        const responses = await Promise.all(promises);

        const embeddingAndIndex = responses.map((res, index) => ({
            index,
            embedding: res.data.embedding,
        }));

        return new IngestionResponse(IngestionStep.embedded, embeddingAndIndex, 'sucessfully done with embedding')
        
    } catch (error) {
        
        console.log('error while embedding : ', error)
        throw new IngestionError(IngestionStep.chunked, 'failed to embed chunks')

    }
}