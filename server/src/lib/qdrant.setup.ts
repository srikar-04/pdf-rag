import { IngestionStep } from "../generated/prisma/enums.js";
import IngestionError from "../utils/ingestionError.js";
import { qdrantClient } from "./qdrant.client.js";

const COLLECTION_NAME = "pdf-rag-system";

const VECTOR_DIMENSION = 768;

export async function ensureQdrantCollection() {
  const exists = await qdrantClient.collectionExists(COLLECTION_NAME);

  if (!exists) {
    console.log("Creating Qdrant collection...");

    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_DIMENSION,
        distance: "Cosine",
        on_disk: true,
      },
    });

    console.log("Qdrant collection created.");
  } else {
    console.log("Qdrant collection already exists.");

    const info = await qdrantClient.getCollection(COLLECTION_NAME);

    const existingDim = info.config.params.vectors?.size;

    if (existingDim !== VECTOR_DIMENSION) {
      throw new IngestionError(
        IngestionStep.embedded,
        `Vector dimension mismatch. Expected ${VECTOR_DIMENSION}, got ${existingDim}`
      );
    }
  }
}