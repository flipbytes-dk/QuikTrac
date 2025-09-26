-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "ceipalId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobSeekerCeipalId" TEXT,
    "submissionId" INTEGER,
    "taxTerm" TEXT,
    "modified" TEXT,
    "pipelineStatus" TEXT,
    "source" TEXT,
    "resumeUrl" TEXT,
    "submittedBy" TEXT,
    "businessUnitId" INTEGER,
    "currencyCode" TEXT,
    "taggedBy" TEXT,
    "taggedOn" TEXT,
    "selectedSubmissionDocuments" TEXT,
    "mergedPdfDocument" TEXT,
    "mergeDocumentPath" TEXT,
    "ceipalApplicantId" INTEGER,
    "payRate" JSONB,
    "documents" JSONB,
    "employmentType" TEXT,
    "submittedOn" TEXT,
    "submissionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_ceipalId_key" ON "public"."Submission"("ceipalId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_applicantId_key" ON "public"."Submission"("applicantId");

-- CreateIndex
CREATE INDEX "Submission_submissionId_idx" ON "public"."Submission"("submissionId");

-- CreateIndex
CREATE INDEX "Submission_source_idx" ON "public"."Submission"("source");

-- CreateIndex
CREATE INDEX "Submission_submissionStatus_idx" ON "public"."Submission"("submissionStatus");

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
