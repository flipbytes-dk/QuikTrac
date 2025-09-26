-- CreateTable
CREATE TABLE "public"."LinkedInProfile" (
    "id" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "jobCode" TEXT,
    "fullName" TEXT,
    "headline" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "json" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInProfile_linkedinUrl_key" ON "public"."LinkedInProfile"("linkedinUrl");

-- CreateIndex
CREATE INDEX "LinkedInProfile_jobCode_idx" ON "public"."LinkedInProfile"("jobCode");

-- CreateIndex
CREATE INDEX "LinkedInProfile_location_idx" ON "public"."LinkedInProfile"("location");
