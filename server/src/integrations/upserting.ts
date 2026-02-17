import dotenv from 'dotenv'
dotenv.config()
import { qdrantClient } from '../lib/qdrant.client.js'
import IngestionError from '../utils/ingestionError.js'
import { IngestionStep } from '../generated/prisma/enums.js'
import {v5 as uuidv5} from 'uuid'
import type { Document } from '../generated/prisma/client.js'
import type { ChunkInfoType } from './chunking.js'
import IngestionResponse from '../utils/ingestionResponse.js'

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const COLLECTION_NAME = "pdf-rag-system";

type UpsertParams = {
  embeddingsAndIndex: {
    index: number;
    embedding: number[];
  }[];
  rawChunks: string[];
  chunkInfo: {
    chunkHash: string;
    chunkIndex: number;
  }[];
  docDetails: Document
};

export const upserting = async ({embeddingsAndIndex, rawChunks, chunkInfo, docDetails}: UpsertParams) => {

    const BATCH_SIZE = 100;
    
    // creating qdrant points and then upserting them
    const qdrantPoints = embeddingsAndIndex.map( (embedding) => {

        const chunkHash = chunkInfo[embedding.index]?.chunkHash
        
        const chunkIndex = chunkInfo[embedding.index]?.chunkIndex
        
        
        const text = rawChunks[embedding.index]
        
        if(!chunkHash || chunkIndex === undefined || !text) {
            throw new IngestionError(IngestionStep.embedded, 'cannot find payload in upserting file')
        }

        const id = uuidv5(chunkHash, NAMESPACE)

        return {
            id,
            vector: embedding.embedding,
            payload: {
                text: text,
                chunkHash: chunkHash,
                chunkIndex: chunkIndex,
                documentId: docDetails.id,
                userId: docDetails.userId,
                contentLength: text?.length,
                createdAt: new Date().toISOString()
            }
        }
    })

    try {
        for (let i = 0; i < qdrantPoints.length; i += BATCH_SIZE) {
            const batch = qdrantPoints.slice(i, i + BATCH_SIZE);

            await qdrantClient.upsert(COLLECTION_NAME, {
                wait: true,
                points: batch,
            });
        }
    } catch (error) {
        console.log("error while upserting : ",error)
        throw new IngestionError(IngestionStep.embedded, 'failed to upsert the points')
    }

    return new IngestionResponse(IngestionStep.upserted, {}, 'successfully upserted the points')
}