-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "public"."OutreachChannel" AS ENUM ('whatsapp', 'email', 'voice');

-- CreateEnum
CREATE TYPE "public"."ApplicantStatus" AS ENUM ('imported', 'parsed', 'ranked', 'shortlisted', 'contacted');

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "ceipalId" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "customInstructions" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Applicant" (
    "id" TEXT NOT NULL,
    "ceipalId" TEXT,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "yearsExperience" INTEGER DEFAULT 0,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."ApplicantStatus" NOT NULL DEFAULT 'imported',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resume" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParsedProfile" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "totalExpMonths" INTEGER DEFAULT 0,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ranking" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "explanation" TEXT,
    "rubric" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutreachLog" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "jobId" TEXT,
    "channel" "public"."OutreachChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Consent" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "channel" "public"."OutreachChannel" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShareLink" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicantId" TEXT,
    "jobId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Embedding" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "vector" vector(1536) NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Job_ceipalId_key" ON "public"."Job"("ceipalId");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "public"."Job"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_ceipalId_key" ON "public"."Applicant"("ceipalId");

-- CreateIndex
CREATE INDEX "Applicant_location_idx" ON "public"."Applicant"("location");

-- CreateIndex
CREATE INDEX "Applicant_createdAt_idx" ON "public"."Applicant"("createdAt");

-- CreateIndex
CREATE INDEX "Applicant_skills_idx" ON "public"."Applicant" USING GIN ("skills");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_applicantId_key" ON "public"."Resume"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedProfile_applicantId_key" ON "public"."ParsedProfile"("applicantId");

-- CreateIndex
CREATE INDEX "ParsedProfile_skills_idx" ON "public"."ParsedProfile" USING GIN ("skills");

-- CreateIndex
CREATE INDEX "ParsedProfile_location_idx" ON "public"."ParsedProfile"("location");

-- CreateIndex
CREATE INDEX "Ranking_score_idx" ON "public"."Ranking"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_jobId_applicantId_key" ON "public"."Ranking"("jobId", "applicantId");

-- CreateIndex
CREATE INDEX "OutreachLog_createdAt_idx" ON "public"."OutreachLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "public"."ShareLink"("token");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Embedding_namespace_idx" ON "public"."Embedding"("namespace");

-- Vector index for semantic search
CREATE INDEX "Embedding_vector_idx" ON "public"."Embedding" USING ivfflat ("vector") WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Applicant" ADD CONSTRAINT "Applicant_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resume" ADD CONSTRAINT "Resume_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParsedProfile" ADD CONSTRAINT "ParsedProfile_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ranking" ADD CONSTRAINT "Ranking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ranking" ADD CONSTRAINT "Ranking_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutreachLog" ADD CONSTRAINT "OutreachLog_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutreachLog" ADD CONSTRAINT "OutreachLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consent" ADD CONSTRAINT "Consent_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
