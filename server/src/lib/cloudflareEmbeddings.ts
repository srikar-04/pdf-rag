import OpenAI from "openai";
import { env } from "../config/env.schema.js";

const cloudflareClient = new OpenAI({
  apiKey: env.CLOUDFLARE_API_TOKEN,
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
});

export const generateEmbeddings = async (
  input: string | string[]
): Promise<number[][]> => {
  const response = await Promise.race([
    cloudflareClient.embeddings.create({
      model: env.CLOUDFLARE_EMBEDDING_MODEL,
      input,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Embedding request timed out after ${env.EMBEDDING_TIMEOUT_MS}ms`)),
        env.EMBEDDING_TIMEOUT_MS
      )
    ),
  ]);

  const embeddings = response.data.map((item) => item.embedding);

  for (const embedding of embeddings) {
    if (embedding.length !== env.EMBEDDING_VECTOR_DIMENSION) {
      throw new Error(
        `Embedding dimension mismatch: expected ${env.EMBEDDING_VECTOR_DIMENSION}, got ${embedding.length}. ` +
        `Update CLOUDFLARE_EMBEDDING_MODEL or EMBEDDING_VECTOR_DIMENSION to match your Qdrant collection.`
      );
    }
  }

  return embeddings;
};
