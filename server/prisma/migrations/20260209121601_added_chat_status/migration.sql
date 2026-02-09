-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('empty', 'active');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "chatStatus" "ChatStatus" NOT NULL DEFAULT 'empty';
