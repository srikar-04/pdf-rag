/*
  Warnings:

  - A unique constraint covering the columns `[userId,documentHash]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Document_documentHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "Document_userId_documentHash_key" ON "Document"("userId", "documentHash");
