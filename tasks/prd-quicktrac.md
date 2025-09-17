# Quicktrac — Product Requirements Document (PRD)

## 1. Introduction / Overview

Quicktrac is a web application for a Recruitment Process Outsourcing (RPO) team to dramatically reduce time-to-shortlist and improve candidate quality by leveraging AI across sourcing, screening, ranking, and outreach. It integrates with Ceipal ATS to pull jobs and applicants, uses LLMs to rank and summarize candidates against job requirements, stores resumes and parsed data for fast retrieval, and orchestrates multi-channel outreach (WhatsApp, email, voice AI). It also supports passive LinkedIn profile discovery via Google Custom Search API, and can draft high-quality job descriptions.

Primary problems addressed:
- Excessive time and manual effort required to shortlist qualified candidates from Ceipal.
- Inconsistent screening quality due to subjective or ad-hoc criteria.
- Slow, inconsistent outreach and follow-up with candidates and clients.

Primary goals:
- End-to-end workflow from job ingestion to client-ready shortlist with AI ranking and explainability.
- Fast, consistent, and configurable rubric-based scoring and filtering.
- Integrated, compliant outreach and audit trails.


## 2. Goals

- Reduce time-to-shortlist by 50% for typical roles within 60 days of launch.
- Increase qualified shortlist rate by 30% via rubric-driven AI ranking.
- Enable multi-channel candidate outreach in-app, with full audit trails and basic compliance controls (GDPR + India DPDP).
- Provide JD generator that produces client-ready drafts with minimal inputs.
- Support passive LinkedIn discovery to expand top-of-funnel beyond Ceipal applicants.


## 3. User Stories

- As a Recruiter, I can log in and enter a Ceipal Job ID to fetch job details and all applicants for that job.
- As a Recruiter, I can apply a default AI-based ranking rubric (skills, experience, education, etc.) to generate a score per candidate and set a threshold to shortlist.
- As a Recruiter, I can add custom instructions per job to guide ranking (e.g., prioritize fintech domain or specific certifications).
- As a Recruiter, I can view an explainable score breakdown and key matched evidence for each candidate.
- As a Recruiter, I can store original resumes in S3 and have parsed profile data searchable in the app.
- As a Recruiter, I can contact shortlisted candidates via WhatsApp, email, or voice AI and record all communications.
- As a Recruiter, I can export or email a client-ready shortlist with resume links and scoring summaries.
- As a Recruiter, I can generate a job description based on minimal inputs (title, seniority, skills, location, etc.).
- As a Recruiter, I can run passive searches to discover LinkedIn profiles relevant to a job description, scrape public details, and rank them alongside applicants.
- As an Admin, I can manage organization settings, default rubric weights, and messaging templates.
- As a Client viewer, I can view the final shortlist shared with me (read-only).


## 4. Functional Requirements

Authentication & Roles
1. The system must support email + password authentication.
2. The system must support roles: Recruiter, Admin, and Client Viewer.
3. Admins must be able to invite/manage users.

Ceipal Integration
4. The system must fetch job details and applicants from Ceipal using provided credentials and API keys.
5. The system must support writing back statuses/notes to Ceipal (configurable per org/job).
6. The system must support on-demand sync by Job ID; background sync cadence will be determined later (see Open Questions).
7. The system must handle and surface API errors and rate limits gracefully.

AI Ranking & Explainability
8. The system must rank candidates against a job using LLMs with a default rubric (weights may be adjusted later):
   - Skills match: 35
   - Years of relevant experience: 20
   - Education: 10
   - Role/title alignment: 10
   - Domain/industry match: 10
   - Recency: 10
   - Location/availability constraints: 5
9. The system must allow a recruiter to set a numeric threshold (0–100) for shortlisting (default 70).
10. The system must accept custom instructions at the job level that influence ranking.
11. The system must show score breakdowns and matched evidence for transparency.
12. The system must support fallback from OpenAI gpt-5 to GPT-4o family if gpt-5 is unavailable.

Resume Storage & Parsing
13. The system must store original resumes (PDF and DOCX) in an AWS S3 bucket in the Mumbai region.
14. The system must parse resumes into structured JSON (e.g., name, contact, skills, work history, education) using a dedicated parser pipeline plus LLM normalization.
15. The system must store parsed JSON and reference to original file; both should be retrievable.
16. The system must ensure encryption at rest (S3 SSE) and basic PII safeguards.

Database & Search
17. The system must persist applicants, resumes, parsed profiles, jobs, rankings, and outreach logs in a Postgres database hosted on a Hetzner VPS.
18. The system must support vector similarity search (pgvector) for semantic queries.
19. The system must support the following queries: filters (location, skills, years), keyword search, and semantic search.

Candidate Outreach
20. The system must support WhatsApp messaging via Meta WhatsApp Business API and Twilio WhatsApp (provider selectable per org/job).
21. The system must support email sending; initial provider: AWS SES (with DKIM/SPF guidance). Alternative providers may be configured later.
22. The system must support voice outreach via a Voice AI provider; initial provider: Vapi, with an abstraction to allow later support for Retell AI/ElevenLabs.
23. The system must record audit logs for all outreach: channel, timestamp, message template, user, and outcome status.
24. The system must allow basic rate limiting and business-hours windows for outreach.
25. The system must track and store consent status per candidate where applicable.

Client Delivery
26. The system must allow recruiters to email a client-ready shortlist including:
   - Candidate summary, score, and key highlights
   - Resume links (S3 pre-signed URLs) or attached PDFs (configurable)
   - Optional scoring breakdown per candidate
27. The system must optionally provide a client portal view (read-only) to review the shortlist.

JD Generator
28. The system must generate a JD draft using LLMs from inputs: title, seniority, skills, location, compensation range, and domain.
29. The system must output Markdown by default; HTML export is optional.
30. The system must provide tone presets (e.g., formal, concise, sales-focused).

Passive LinkedIn Discovery
31. The system must generate an array of Google Custom Search queries that shard the space to target LinkedIn profile pages only, with intent to yield >100 total results when paginated.
32. The system must scrape public LinkedIn profile pages discovered (subject to ToS risks), using Playwright with proxy rotation.
33. The system must extract key fields (e.g., name, headline/title, location, current company, recent roles, education, key skills, profile URL, contact if public) and rank profiles using the same rubric.
34. The system must merge de-duplicated scraped profiles into search results and support the same outreach flow.

Observability & Audit
35. The system must log major API calls, AI prompts (with redaction/hashing for sensitive segments), and model responses metadata.
36. The system must provide an audit trail per candidate and per job.
37. The system must support export of logs on request.

Security & Compliance
38. The system must support GDPR and India DPDP-aligned data handling: consent tracking, data subject requests, deletion workflow, and retention policy configuration.
39. The system must secure secrets via .env in development and a managed secret store in production.


## 5. Non-Goals (Out of Scope)

- Native mobile apps (initial release is web-only).
- Full-fledged CRM features beyond recruitment outreach and logs.
- Advanced analytics dashboards (beyond basic metrics) in MVP.
- Automated offer management or onboarding workflows.


## 6. Design Considerations (Optional)

- Web app built with Next.js + TypeScript using shadcn/ui and Tailwind CSS for UI components.
- Information architecture (MVP):
  - Login
  - Dashboard (enter Job ID, recent jobs)
  - Results List (ranking table, threshold slider, filters, custom instructions)
  - Candidate Detail Drawer (score breakdown, matched evidence, resume preview)
  - Outreach Composer (WhatsApp, Email, Voice)
  - JD Generator
  - Settings (rubric defaults, providers, templates, compliance, API keys)
- Accessibility: keyboard navigation, color contrast; exportable shortlist PDFs where needed.


## 7. Technical Considerations (Optional)

- Models: Prefer OpenAI gpt-5 if available; fallback to GPT-4o family. Implement provider abstraction.
- Ceipal: Use official API for authentication, job/applicant retrieval, and optional write-back of statuses/notes.
- Parsing: Use best-available parser stack (e.g., pdfminer/textract/docx parsing) + LLM-based normalization for robust extraction.
- Storage: S3 (Mumbai) for originals and parsed JSON; pre-signed URLs for secure sharing.
- DB: Postgres + pgvector on Hetzner VPS; Prisma ORM optional; enforce migrations and indices for common filters.
- Search: Hybrid (filters + keyword + semantic). Create skill taxonomy normalization with embeddings.
- Outreach: 
  - WhatsApp providers (Meta/Twilio) behind an adapter interface.
  - Email via AWS SES initially.
  - Voice via Vapi initially; abstract for Retell/ElevenLabs later.
- Observability: Centralized logging, structured logs (JSON), redact PII in prompts; request IDs for traceability.
- Secrets: 
  - Dev: .env
  - Prod: AWS Secrets Manager or Doppler (final choice pending).
- Environment variables (provided): CEIPAL_EMAIL, CEIPAL_PASSWORD, CEIPAL_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, GOOGLE_PUBLIC_URL.


## 8. Success Metrics

- Reduce time-to-shortlist by 50% within 60 days for at least 10 representative roles.
- Increase qualified shortlist rate by 30% compared to baseline manual process.
- Reduce manual screening effort by 8 hours/week per recruiter.
- Increase candidate response rate by 20% through multi-channel outreach.


## 9. Open Questions

- Ceipal sync cadence: keep on-demand only for MVP, or add background sync (interval/webhooks)?
- Ceipal rate limits/daily caps: any org-specific constraints we must honor?
- Voice provider finalization: start with Vapi—acceptable? Any must-have for Retell or ElevenLabs in MVP?
- Email provider: proceed with AWS SES in MVP?
- Consent capture: what triggers explicit consent collection (first message vs per-channel)? Any template language constraints?
- Outreach windows: define default business hours and per-country rules.
- S3 bucket naming and retention policy (e.g., 12 months by default). Confirm data residency needs beyond Mumbai.
- LinkedIn scraping: daily cap, proxy provider choice, and fallback approach (e.g., enrichment services) if scraping is blocked.
- Client portal: MVP read-only link acceptable, or email-only for phase 1?
- Budget guardrails for LLM usage (daily/monthly caps and throughput targets).

