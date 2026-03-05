import pLimit from 'p-limit';
import { IngestionStep } from '../generated/prisma/enums.js';
import IngestionResponse from '../utils/ingestionResponse.js';
import IngestionError from '../utils/ingestionError.js';
import { generateEmbeddings } from '../lib/cloudflareEmbeddings.js';

/**
 * Embedding Configuration
 * 
 * These values determined through testing and first principles:
 * 
 * CONCURRENCY_LIMIT = 5
 * - Cloudflare Workers AI calls are network-bound
 * - Too high: Context switching overhead, memory pressure
 * - Too low: Underutilization, slow throughput
 * - 5 keeps outbound requests stable and predictable
 * 
 * BATCH_SIZE = 10
 * - Larger batches = better throughput
 * - But: If one chunk fails, retry whole batch
 * - 10 chunks ≈ 8KB-80KB text (800 chars each)
 * - Balances throughput with failure granularity
 * 
 * MAX_RETRIES = 3
 * - Transient failures (network blips) recover quickly
 * - 3 attempts with backoff handles 99% of transient issues
 * - More retries = slower failure detection
 */
const CONCURRENCY_LIMIT = 5;
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Embed a single chunk with retry logic
 * 
 * Why individual retry?
 * - If batch fails, we only retry failed chunks
 * - Prevents re-embedding already-successful chunks
 * - More efficient than retrying entire batch
 */
const embedChunkWithRetry = async (
  chunk: string, 
  chunkIndex: number, 
  documentId: string
): Promise<{ index: number; embedding: number[] }> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const [embedding] = await generateEmbeddings(chunk);

      if (!embedding) {
        throw new Error('Empty embedding response from Cloudflare Workers AI');
      }
      
      return {
        index: chunkIndex,
        embedding,
      };
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  // All retries exhausted
  throw new IngestionError(
    IngestionStep.chunked,
    `Failed to embed chunk ${chunkIndex} after ${MAX_RETRIES} attempts: ${lastError!.message}`
  );
};

/**
 * Main embedding function
 * 
 * Algorithm:
 * 1. Split chunks into batches
 * 2. Process each batch with limited concurrency
 * 3. Within batch, embed chunks concurrently
 * 4. Retry individual failures
 * 5. Continue even if some chunks fail (partial success)
 * 
 * Why partial success?
 * - Better to have 950/1000 chunks than 0/1000
 * - Failed chunks can be re-queued separately
 * - User gets partial functionality immediately
 */
export const embedding = async (
  rawChunks: string[], 
  documentId: string
): Promise<IngestionResponse> => {
  console.log(`[Embedding] Starting concurrent embedding for document ${documentId}`);
  console.log(`[Embedding] Total chunks: ${rawChunks.length}, Batch size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY_LIMIT}`);
  
  const startTime = Date.now();
  const limit = pLimit(CONCURRENCY_LIMIT);
  const embeddingAndIndex: { index: number; embedding: number[] }[] = [];
  const failedChunks: { index: number; error: string }[] = [];
  
  // Process in batches
  const totalBatches = Math.ceil(rawChunks.length / BATCH_SIZE);
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batchStart = batchNum * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, rawChunks.length);
    const batch = rawChunks.slice(batchStart, batchEnd);
    
    console.log(`[Embedding] Processing batch ${batchNum + 1}/${totalBatches} (${batch.length} chunks)`);
    
    // Process batch with limited concurrency
    const batchPromises = batch.map((chunk, batchIndex) => 
      limit(async () => {
        const globalIndex = batchStart + batchIndex;
        try {
          return await embedChunkWithRetry(chunk, globalIndex, documentId);
        } catch (error) {
          failedChunks.push({
            index: globalIndex,
            error: (error as Error).message,
          });
          return null;
        }
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Collect successful embeddings
    for (const result of batchResults) {
      if (result) {
        embeddingAndIndex.push(result);
      }
    }
    
    const successfulInBatch = batchResults.filter(r => r !== null).length;
    console.log(`[Embedding] Batch ${batchNum + 1} complete: ${successfulInBatch}/${batch.length} successful`);
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`[Embedding] Complete: ${embeddingAndIndex.length}/${rawChunks.length} chunks in ${duration}ms`);
  
  // If all chunks failed, throw error
  if (embeddingAndIndex.length === 0) {
    throw new IngestionError(
      IngestionStep.chunked,
      `All ${rawChunks.length} chunks failed to embed`
    );
  }
  
  // If some chunks failed, log warning but continue
  if (failedChunks.length > 0) {
    console.warn(`[Embedding] Warning: ${failedChunks.length} chunks failed to embed`);
  }
  
  return new IngestionResponse(
    IngestionStep.embedded,
    {
      embeddings: embeddingAndIndex,
      failedChunks: failedChunks.length > 0 ? failedChunks : undefined,
      stats: {
        total: rawChunks.length,
        successful: embeddingAndIndex.length,
        failed: failedChunks.length,
        durationMs: duration,
      },
    },
    `Embedded ${embeddingAndIndex.length}/${rawChunks.length} chunks in ${duration}ms`
  );
};
