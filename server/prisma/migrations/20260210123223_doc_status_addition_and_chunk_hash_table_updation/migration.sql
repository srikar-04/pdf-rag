/*
  Warnings:

  - The values [uploading,indexing] on the enum `DocStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `contentLenght` to the `ChunkHash` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IngestionStep" AS ENUM ('none', 'fetched', 'normalized', 'chunked', 'embedded', 'upserted');

-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('none', 'ready', 'failed');

-- AlterEnum
BEGIN;
CREATE TYPE "DocStatus_new" AS ENUM ('processing', 'Ingesting', 'ready', 'failed');
ALTER TABLE "Document" ALTER COLUMN "documentStatus" TYPE "DocStatus_new" USING ("documentStatus"::text::"DocStatus_new");
ALTER TYPE "DocStatus" RENAME TO "DocStatus_old";
ALTER TYPE "DocStatus_new" RENAME TO "DocStatus";
DROP TYPE "public"."DocStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "ChunkHash" ADD COLUMN     "contentLenght" INTEGER NOT NULL,
ADD COLUMN     "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "ingestionStep" "IngestionStep" NOT NULL DEFAULT 'none';
