import axios from "axios";
import { env } from "../config/env.schema.js";

const CLOUDFLARE_RUN_URL = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${env.CLOUDFLARE_EMBEDDING_MODEL}`;

const toEmbeddingMatrix = (result: unknown): number[][] => {
  if (!result || typeof result !== "object") return [];

  const container = result as Record<string, unknown>;
  const maybeData = container.data;

  if (Array.isArray(maybeData)) {
    if (maybeData.length === 0) return [];

    // Single embedding: [0.1, 0.2, ...]
    if (typeof maybeData[0] === "number") {
      return [maybeData as number[]];
    }

    // Multiple embeddings: [[...], [...]]
    if (Array.isArray(maybeData[0])) {
      return maybeData as number[][];
    }
  }

  return [];
};

export const generateEmbeddings = async (
  input: string | string[]
): Promise<number[][]> => {
  const texts = Array.isArray(input) ? input : [input];

  const response = await axios.post(
    CLOUDFLARE_RUN_URL,
    { text: texts },
    {
      timeout: env.EMBEDDING_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = response.data?.result;
  const embeddings = toEmbeddingMatrix(result);

  if (!embeddings.length) {
    throw new Error("Cloudflare AI did not return embeddings in expected format");
  }

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
