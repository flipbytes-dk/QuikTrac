-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "applyJob" TEXT,
ADD COLUMN     "applyJobWithoutRegistration" TEXT,
ADD COLUMN     "assignedRecruiter" TEXT,
ADD COLUMN     "businessUnitId" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "closingDate" TEXT,
ADD COLUMN     "company" INTEGER,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "isRecycle" INTEGER,
ADD COLUMN     "jobCategory" TEXT,
ADD COLUMN     "jobEndDate" TEXT,
ADD COLUMN     "jobStartDate" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "modified" TEXT,
ADD COLUMN     "modifiedBy" TEXT,
ADD COLUMN     "payRates" JSONB,
ADD COLUMN     "postOnCareerportal" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "postedBy" TEXT,
ADD COLUMN     "primaryRecruiter" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "publicJobDesc" TEXT,
ADD COLUMN     "publicJobTitle" TEXT,
ADD COLUMN     "recruitmentManager" TEXT,
ADD COLUMN     "remoteOpportunities" TEXT,
ADD COLUMN     "requisitionDescription" TEXT,
ADD COLUMN     "salesManager" TEXT,
ADD COLUMN     "secondaryCities" TEXT,
ADD COLUMN     "secondaryPostalCodes" TEXT,
ADD COLUMN     "secondaryStates" TEXT,
ADD COLUMN     "skills" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "taxTerms" TEXT,
ADD COLUMN     "updated" TEXT;

-- CreateIndex
CREATE INDEX "Job_city_idx" ON "public"."Job"("city");

-- CreateIndex
CREATE INDEX "Job_state_idx" ON "public"."Job"("state");

-- CreateIndex
CREATE INDEX "Job_country_idx" ON "public"."Job"("country");

-- CreateIndex
CREATE INDEX "Job_employmentType_idx" ON "public"."Job"("employmentType");

-- CreateIndex
CREATE INDEX "Job_jobStartDate_idx" ON "public"."Job"("jobStartDate");
