/*
  Warnings:

  - A unique constraint covering the columns `[jobCode]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "jobCode" TEXT;

-- CreateTable
CREATE TABLE "public"."LinkedInRanking" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "overallRating" DOUBLE PRECISION,
    "decision" TEXT,
    "scoreBreakdown" JSONB,
    "email" JSONB,
    "questions" JSONB,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedInRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkedInRanking_jobCode_idx" ON "public"."LinkedInRanking"("jobCode");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInRanking_profileId_jobCode_key" ON "public"."LinkedInRanking"("profileId", "jobCode");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobCode_key" ON "public"."Job"("jobCode");

-- AddForeignKey
ALTER TABLE "public"."LinkedInRanking" ADD CONSTRAINT "LinkedInRanking_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."LinkedInProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
