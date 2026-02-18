import { qdrantClient } from "../lib/qdrant.client.js"
import { COLLECTION_NAME } from "../integrations/upserting.js"

type RetrievalType = {
    embeddings: number[],
    userId: string,
    documentId: string
}

export type RetrievalResponse = {
    context: string,
    chunks: string[],
    found: boolean
}

export const queryRetrieval = async ({ embeddings, userId, documentId }: RetrievalType): Promise<RetrievalResponse> => {


    // search qdrant points using query
    // filter points using userId and documentId
    // get top k elements (for now k = 5)

    const response = await qdrantClient.query(COLLECTION_NAME, {
        query: embeddings,
        filter: {
            must: [
                {
                    key: "userId",
                    match: {
                        value: userId
                    }
                },
                {
                    key: "documentId",
                    match: {
                        value: documentId
                    }
                }
            ]
        },
        limit: 5,
        with_payload: true,
        score_threshold: 0.4
    })

    if (response.points.length === 0) {
        // return empty context from here
        return { context: "", chunks: [], found: false }
    }

    // 2) removing duplicates using chunk hash
    const seenHashes = new Set<string>()

    const uniquePoints = response.points.filter(point => {
        const hash = point.payload?.chunkHash as string | undefined
        if (!hash) return false

        if (seenHashes.has(hash)) return false
        seenHashes.add(hash)
        return true
    })

    if (!uniquePoints.length) {
        return { context: "", chunks: [], found: false }
    }

    // 3) sorting points using score
    const ranked = uniquePoints.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));


    // 4) adjacent expansion and mapping

    const expandedChunks: string[] = [];

    for (let i = 0; i < ranked.length; i++) {
        const current = ranked[i];
        const text = current?.payload?.text as string | undefined;

        if (!text) continue;

        expandedChunks.push(text);
    }

    // 5) contructing chunks for better llm response
    const context = expandedChunks
        .map((chunk, index) => `Chunk ${index + 1}:\n${chunk}`)
        .join("\n\n---\n\n");

    return {
        context,
        chunks: expandedChunks,
        found: true,
    };

}