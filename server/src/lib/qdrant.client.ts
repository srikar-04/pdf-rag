import dotenv from 'dotenv'
dotenv.config()
import IngestionError from '../utils/ingestionError.js'
import { QdrantClient } from '@qdrant/js-client-rest'
import { IngestionStep } from '../generated/prisma/client.js'

const url = process.env.QDRANT_URL
const qdrant_api_key = process.env.QDRANT_API_KEY

if(!url || !qdrant_api_key) {
    throw new IngestionError(IngestionStep.embedded, 'qdrant credentails not found')
}

export const qdrantClient = new QdrantClient({
    apiKey: qdrant_api_key,
    url: url
})