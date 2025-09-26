-- CreateTable
CREATE TABLE "public"."ProcessingJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobCode" TEXT,
    "parsingMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "s3UploadCount" INTEGER NOT NULL DEFAULT 0,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "embeddingCount" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parsingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openaiCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "embeddingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "successfulApplicants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failedApplicants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProcessingLog" (
    "id" TEXT NOT NULL,
    "processingJobId" TEXT NOT NULL,
    "applicantId" TEXT,
    "applicantName" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessingJob_jobId_idx" ON "public"."ProcessingJob"("jobId");

-- CreateIndex
CREATE INDEX "ProcessingJob_status_idx" ON "public"."ProcessingJob"("status");

-- CreateIndex
CREATE INDEX "ProcessingJob_startedAt_idx" ON "public"."ProcessingJob"("startedAt");

-- CreateIndex
CREATE INDEX "ProcessingLog_processingJobId_idx" ON "public"."ProcessingLog"("processingJobId");

-- CreateIndex
CREATE INDEX "ProcessingLog_level_idx" ON "public"."ProcessingLog"("level");

-- CreateIndex
CREATE INDEX "ProcessingLog_timestamp_idx" ON "public"."ProcessingLog"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."ProcessingLog" ADD CONSTRAINT "ProcessingLog_processingJobId_fkey" FOREIGN KEY ("processingJobId") REFERENCES "public"."ProcessingJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
