-- DropIndex
DROP INDEX "public"."Embedding_vector_idx";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);
