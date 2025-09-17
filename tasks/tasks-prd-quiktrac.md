## Relevant Files

- `package.json` - Project dependencies, scripts, workspace config.
- `next.config.ts` - Next.js configuration.
- `tsconfig.json` - TypeScript configuration.
- `next-env.d.ts` - Next.js TypeScript ambient types.
- `.eslintrc.json` - ESLint configuration.
- `tailwind.config.ts` - Tailwind CSS configuration.
- `postcss.config.js` - PostCSS configuration for Tailwind.
- `.editorconfig` - Editor configuration for consistent indentation and newlines.
- `.prettierrc.json` - Prettier configuration (single quotes, trailing commas, 2-space indent).
- `.prettierignore` - Ignore list for Prettier formatting.
- `.env.example` - Sample environment file (Mumbai region notes for S3/SES).
 - `src/app/globals.css` - Global styles with Tailwind directives.
- `src/app/layout.tsx` - Root layout with shadcn theme, providers.
- `src/app/page.tsx` - Bootstrap home page (App Router).
- `src/lib/utils.ts` - Utility `cn` function for class merging.
- `src/components/ui/button.tsx` - Button component.
- `src/components/ui/input.tsx` - Input component.
- `src/components/ui/dialog.tsx` - Dialog component wrappers.
- `src/components/ui/table.tsx` - Table primitives.
- `src/components/ui/tabs.tsx` - Tabs components.
- `src/components/ui/tooltip.tsx` - Tooltip components.
- `src/app/(auth)/login/page.tsx` - Login page (email + password).
- `src/app/(dashboard)/dashboard/page.tsx` - Main dashboard to enter Job ID and view results.
- `src/app/(jobs)/job/[jobId]/page.tsx` - Job results list with ranking, filters, threshold slider, custom instructions.
- `src/app/(candidates)/candidate/[id]/page.tsx` - Candidate detail view/drawer with score breakdown and resume preview.
- `src/app/(outreach)/outreach/page.tsx` - Outreach composer (WhatsApp, Email, Voice).
- `src/app/jd-generator/page.tsx` - JD generator UI.
- `src/app/client/[shareId]/page.tsx` - Read-only client shortlist view (optional in MVP).
- `src/app/api/auth/login/route.ts` - API route for email/password login.
- `src/app/api/auth/register/route.ts` - API route to create users (admin only, optional for seed).
- `src/app/api/ceipal/jobs/[jobId]/route.ts` - On-demand job + applicants fetch from Ceipal.
- `src/app/api/ranking/route.ts` - AI ranking endpoint applying rubric and custom instructions.
- `src/app/api/outreach/whatsapp/route.ts` - WhatsApp send message (Meta/Twilio via adapter).
- `src/app/api/outreach/email/route.ts` - Email send (SES) endpoint.
- `src/app/api/outreach/voice/route.ts` - Voice outreach trigger (Vapi) endpoint.
- `src/app/api/jd/route.ts` - JD generation endpoint (OpenAI).
- `src/app/api/search/route.ts` - Candidate search (filters/keyword/semantic).
- `src/app/api/client/share/route.ts` - Create share link for client shortlist.
- `src/lib/env.ts` - Runtime-safe env var loader.
- `src/lib/db/prisma.ts` - Prisma client setup.
- `prisma/schema.prisma` - Database schema (users, roles, jobs, applicants, resumes, parsed profiles, rankings, outreach logs, consents, shares).
- `src/lib/storage/s3.ts` - S3 client (Mumbai), pre-signed URL helpers.
- `src/lib/ceipal/client.ts` - Ceipal API client (auth, jobs, applicants, write-back).
- `src/lib/ai/openai.ts` - OpenAI client with gpt-5 → GPT-4o fallback, rate/budget guard.
- `src/lib/ai/ranking.ts` - Ranking pipeline, rubric weights, explainability output.
- `src/lib/parsing/resume.ts` - Resume ingestion + parsing pipeline (PDF/DOCX + LLM normalization).
- `src/lib/search/vector.ts` - pgvector helpers for embeddings, upserts, queries.
- `src/lib/search/index.ts` - Hybrid search orchestration (filters + keyword + semantic).
- `src/lib/outreach/whatsapp/meta.ts` - Meta WhatsApp Business adapter.
- `src/lib/outreach/whatsapp/twilio.ts` - Twilio WhatsApp adapter.
- `src/lib/outreach/email/ses.ts` - AWS SES email sender.
- `src/lib/outreach/voice/vapi.ts` - Vapi voice outreach adapter.
- `src/lib/linkedin/gcse.ts` - Google Custom Search query generator + client.
- `src/lib/linkedin/scraper.ts` - Playwright + proxy rotation scraper for LinkedIn public profiles.
- `src/lib/observability/logger.ts` - Structured logging (JSON), request IDs.
- `src/lib/security/rate-limit.ts` - Simple in-memory sliding window rate limiter (dev/single-instance).
- `src/lib/observability/audit.ts` - Audit trail utilities (per candidate/job/outreach).
- `src/middleware.ts` - Middleware for security headers and CORS now; future: auth/session, role guards, rate limits, business hours.
- `jest.config.js` - Jest unit test configuration.
- `jest.setup.ts` - Jest setup file to extend matchers.
- `src/lib/utils.test.ts` - Example unit test for utility.
- `src/components/ui/button.test.tsx` - Example React component test.
- `src/**/*.test.ts` - Unit tests (example locations alongside code files).
- `src/**/*.test.tsx` - Component tests for pages/components.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `pnpm test` to run all tests; single test: `pnpm test src/path/to/file.test.ts` or `pnpm test -t "<name substring>"`.

## Tasks

- [x] 1.0 Project Bootstrap and Tooling
  - [x] 1.1 Initialize Next.js (App Router) with TypeScript and ESLint.
  - [x] 1.2 Add Tailwind CSS and configure `tailwind.config.ts` and `postcss.config.js`.
  - [x] 1.3 Install shadcn/ui and generate base components (Button, Input, Dialog, Table, Tabs, Tooltip).
  - [x] 1.4 Add absolute imports/aliases (e.g., `@/lib`, `@/app`).
  - [x] 1.5 Set up Jest + React Testing Library; add example test.
  - [x] 1.6 Add scripts: `typecheck`, `lint`, `test`, `dev`, `build`, `start`.
  - [x] 1.7 Configure `.editorconfig` and Prettier for consistent formatting.

- [ ] 2.0 Security, Secrets, and Environment Configuration
  - [x] 2.1 Implement `src/lib/env.ts` to validate required envs (Ceipal, OpenAI, Google CSE, S3, SES, DB, WhatsApp providers, Vapi).
  - [x] 2.2 Create `.env.example` with all keys and notes (Mumbai region for S3/SES).
  - [x] 2.3 Add basic security headers and CORS policy.
  - [x] 2.4 Document production secrets strategy (AWS Secrets Manager or Doppler) in `README`.
  - [x] 2.5 Add rate limit helper and request ID generator.

- [ ] 3.0 Database Provisioning on Hetzner (Postgres + pgvector) and Prisma Schema
  - [ ] 3.1 Provision Postgres on Hetzner; enable `pgvector` extension.
  - [ ] 3.2 Define `prisma/schema.prisma` models: User, Role, Job, Applicant, Resume, ParsedProfile, Ranking, OutreachLog, Consent, ShareLink, AuditLog, Embedding, ProviderConfig.
  - [ ] 3.3 Implement relations, indices (skills, location, createdAt), and vector columns.
  - [ ] 3.4 Run `prisma migrate dev` locally; `prisma migrate deploy` script for CI.
  - [ ] 3.5 Seed admin user and sample data.
  - [ ] 3.6 Add `src/lib/db/prisma.ts` with robust singleton pattern.

- [ ] 4.0 Authentication and Roles (Email/Password; Admin, Recruiter, Client Viewer)
  - [ ] 4.1 Build `POST /api/auth/register` (admin only) with bcrypt hashing.
  - [ ] 4.2 Build `POST /api/auth/login` issuing secure HTTP-only JWT cookies.
  - [ ] 4.3 Implement `src/middleware.ts` to enforce sessions and role guards.
  - [ ] 4.4 Create login page UI and form validation.
  - [ ] 4.5 Add logout and session keep-alive endpoints.
  - [ ] 4.6 Tests: auth flows, role protection, password hashing.

- [ ] 5.0 Ceipal Integration (On-demand fetch; optional write-back)
  - [ ] 5.1 Implement `src/lib/ceipal/client.ts` (auth, refresh token, jobs, applicants, details).
  - [ ] 5.2 Build `GET /api/ceipal/jobs/[jobId]` to fetch job + applicants on demand.
  - [ ] 5.3 Map Ceipal fields to internal schema (normalize skills, titles, locations).
  - [ ] 5.4 Optional: `POST /api/ceipal/writeback` to update statuses/notes.
  - [ ] 5.5 Handle rate limits and exponential backoff; structured error messages.
  - [ ] 5.6 Tests with mocked Ceipal responses (fixtures).

- [ ] 6.0 Resume Storage on S3 (Mumbai) and Parsing Pipeline (PDF/DOCX)
  - [ ] 6.1 Configure `src/lib/storage/s3.ts` (bucket, KMS/SSE, presigned URLs, key conventions).
  - [ ] 6.2 Implement ingestion job to upload original resumes from Ceipal/app uploads.
  - [ ] 6.3 Implement parsing in `src/lib/parsing/resume.ts` for PDF/DOCX + LLM normalization.
  - [ ] 6.4 Store parsed JSON and link to original; capture parsing confidence.
  - [ ] 6.5 Index skills/experience; generate embeddings for semantic search.
  - [ ] 6.6 Tests with sample resumes (PDF/DOCX) and golden parsed outputs.

- [ ] 7.0 AI Ranking Service (Rubric, Custom Instructions, Threshold, Explainability)
  - [ ] 7.1 Implement `src/lib/ai/openai.ts` with gpt-5 → GPT-4o fallback and budget guard.
  - [ ] 7.2 Implement `src/lib/ai/ranking.ts` to compute rubric score 0–100 and produce explanations.
  - [ ] 7.3 Build `POST /api/ranking` to rank applicants for a job, honoring custom instructions.
  - [ ] 7.4 Add threshold-based shortlist and tagging in DB.
  - [ ] 7.5 Cache ranking results per job/applicant to reduce cost.
  - [ ] 7.6 Tests with mocked models and deterministic fixtures.

- [ ] 8.0 Candidate Profile Store and Search (Filters/Keyword/Semantic)
  - [ ] 8.1 Implement `src/lib/search/vector.ts` and `src/lib/search/index.ts` for hybrid search.
  - [ ] 8.2 Build `POST /api/search` supporting filters, keyword (tsvector), semantic (pgvector).
  - [ ] 8.3 Add dedupe and merge logic across Ceipal + scraped profiles.
  - [ ] 8.4 Tests: search relevance, pagination, filter correctness.

- [ ] 9.0 Candidate Outreach (WhatsApp Meta/Twilio, Email SES, Voice Vapi) with Consent, Rate Limiting, Business Hours
  - [ ] 9.1 Design provider adapter interfaces; implement Meta and Twilio WhatsApp adapters.
  - [ ] 9.2 Implement SES email sender with templates and attachments/presigned links.
  - [ ] 9.3 Implement Vapi voice outreach trigger with call status webhooks.
  - [ ] 9.4 Implement consent tracking model and enforcement.
  - [ ] 9.5 Implement rate limits and business hour windows.
  - [ ] 9.6 Record OutreachLog and link to Candidate/Job with outcomes.
  - [ ] 9.7 Tests: provider stubs, consent enforcement, throttling.

- [ ] 10.0 Client Delivery (Email Shortlist; Optional Client Portal)
  - [ ] 10.1 Build shortlist email generator (SES) with configurable template.
  - [ ] 10.2 Option to attach PDFs or include S3 presigned links.
  - [ ] 10.3 Implement `POST /api/client/share` to generate expiring share links.
  - [ ] 10.4 Build read-only client view page showing candidates and scores.
  - [ ] 10.5 Track client views and audit events.
  - [ ] 10.6 Tests: email rendering, share link auth, portal read-only checks.

- [ ] 11.0 JD Generator (OpenAI)
  - [ ] 11.1 Build `POST /api/jd` with inputs (title, seniority, skills, location, comp, domain).
  - [ ] 11.2 Implement tone presets and Markdown output; optional HTML export.
  - [ ] 11.3 UI for JD generator page with copy/export actions.
  - [ ] 11.4 Tests: prompt shaping, validations, cost guard.

- [ ] 12.0 Passive LinkedIn Discovery (Google Custom Search, Playwright Scraper, Extraction, Ranking, Dedup)
  - [ ] 12.1 Implement query generator to shard searches and target `site:linkedin.com/in`.
  - [ ] 12.2 Call Google CSE, paginate to exceed 100 results across sub-queries.
  - [ ] 12.3 Build Playwright scraper with proxy rotation and robust selectors.
  - [ ] 12.4 Extract fields: name, headline/title, location, current company, recent roles, education, skills, profile URL, contact if public.
  - [ ] 12.5 Deduplicate and normalize; store as ParsedProfile with provenance.
  - [ ] 12.6 Reuse ranking pipeline to score scraped profiles; merge into search results.
  - [ ] 12.7 Feature flag and daily cap; error handling + retries.
  - [ ] 12.8 Tests with recorded fixtures; scraper unit tests.

- [ ] 13.0 Observability and Audit Trails (Structured Logs, Prompt Redaction, Export)
  - [ ] 13.1 Implement `logger.ts` with structured JSON logs and request IDs.
  - [ ] 13.2 Implement `audit.ts` utilities; persist AuditLog events for key actions.
  - [ ] 13.3 Log AI prompts/responses with PII redaction/hashing; store metadata.
  - [ ] 13.4 Build log export endpoints (admin-only) with filters.
  - [ ] 13.5 Tests: log presence, audit integrity, redaction coverage.

- [ ] 14.0 Compliance and Data Lifecycle (GDPR/DPDP, Retention, Deletion, DSAR)
  - [ ] 14.1 Implement consent capture UI and policy references.
  - [ ] 14.2 Implement DSAR endpoints: export, delete candidate data.
  - [ ] 14.3 Implement retention policies (e.g., 12 months) and scheduled purge job.
  - [ ] 14.4 Document data flows and sub-processor list.
  - [ ] 14.5 Tests: DSAR flows, retention purge, consent.

- [ ] 15.0 UI/UX Implementation with shadcn + Tailwind (Pages/Components)
  - [ ] 15.1 Build app shell, navigation, and role-based menu.
  - [ ] 15.2 Login page, Dashboard with Job ID input and recent jobs.
  - [ ] 15.3 Job page with ranking table, filters, threshold slider, custom instructions panel.
  - [ ] 15.4 Candidate detail drawer with score breakdown and resume preview (S3).
  - [ ] 15.5 Outreach composer with templates and provider selection.
  - [ ] 15.6 JD generator page and Settings (rubrics, providers, templates).
  - [ ] 15.7 Accessibility pass and responsive layouts.
  - [ ] 15.8 Tests: RTL component tests for critical flows.

- [ ] 16.0 Deployment & DevOps (Environments, CI/CD, Domain/SSL, SES/S3 setup)
  - [ ] 16.1 GitHub Actions: typecheck, lint, test, build, prisma migrate deploy.
  - [ ] 16.2 Provision AWS S3 (Mumbai) and SES (domain verification, DKIM/SPF).
  - [ ] 16.3 Provision Playwright scraper infra and proxy provider; secret rotation.
  - [ ] 16.4 Configure environments (dev/staging/prod), domains, SSL.
  - [ ] 16.5 Health checks, uptime monitoring, and alerting.
  - [ ] 16.6 Runbooks for on-call (Ceipal/API limits, SES bounces, scraper blocks).

- [ ] 17.0 Performance and Cost Controls (LLM budget caps, Rate Limits, Caching)
  - [ ] 17.1 Track per-job and daily LLM spend; enforce soft/hard caps.
  - [ ] 17.2 Cache Ceipal responses and ranking outputs (etag/job-versioned keys).
  - [ ] 17.3 Batch OpenAI evaluations where possible; streaming for UI responsiveness.
  - [ ] 17.4 Implement API rate limits per user/org.
  - [ ] 17.5 Load test critical endpoints and tune DB indices.
