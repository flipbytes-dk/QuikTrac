-- CreateTable
CREATE TABLE "public"."CostRecord" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostRecord_service_idx" ON "public"."CostRecord"("service");

-- CreateIndex
CREATE INDEX "CostRecord_operation_idx" ON "public"."CostRecord"("operation");

-- CreateIndex
CREATE INDEX "CostRecord_createdAt_idx" ON "public"."CostRecord"("createdAt");
