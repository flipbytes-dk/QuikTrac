# Quicktrac — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 17th September 2025 
**Status:** Draft  
**Stakeholders:** RPO Team, Engineering, Product  

---

## Executive Summary

Quicktrac is an AI-powered recruitment platform designed to streamline the candidate sourcing and screening process for Recruitment Process Outsourcing (RPO) teams. By integrating with existing ATS systems and leveraging advanced AI capabilities, Quicktrac aims to reduce time-to-shortlist by 50% while improving candidate quality by 30%.

---

## 1. Introduction / Overview

### 1.1 Product Vision
Quicktrac is a web application for a Recruitment Process Outsourcing (RPO) team to dramatically reduce time-to-shortlist and improve candidate quality by leveraging AI across sourcing, screening, ranking, and outreach.

### 1.2 Core Capabilities
- **ATS Integration:** Seamless integration with Ceipal ATS to pull jobs and applicants
- **AI-Powered Ranking:** LLM-based candidate ranking and summarization against job requirements
- **Resume Management:** Secure storage and parsing of resumes for fast retrieval
- **Multi-Channel Outreach:** WhatsApp, email, and voice AI communication orchestration
- **Passive Sourcing:** LinkedIn profile discovery via Google Custom Search API
- **Content Generation:** AI-drafted job descriptions

### 1.3 Problem Statement
**Primary problems addressed:**
- **Time Inefficiency:** Excessive time and manual effort required to shortlist qualified candidates from Ceipal
- **Quality Inconsistency:** Inconsistent screening quality due to subjective or ad-hoc criteria
- **Communication Bottlenecks:** Slow, inconsistent outreach and follow-up with candidates and clients

### 1.4 Solution Overview
**Primary goals:**
- End-to-end workflow from job ingestion to client-ready shortlist with AI ranking and explainability
- Fast, consistent, and configurable rubric-based scoring and filtering
- Integrated, compliant outreach and audit trails


## 2. Goals & Success Criteria

### 2.1 Business Objectives
- **Efficiency:** Reduce time-to-shortlist by 50% for typical roles within 60 days of launch
- **Quality:** Increase qualified shortlist rate by 30% via rubric-driven AI ranking
- **Automation:** Reduce manual screening effort by 8 hours/week per recruiter
- **Engagement:** Increase candidate response rate by 20% through multi-channel outreach

### 2.2 Functional Goals
- Enable multi-channel candidate outreach in-app, with full audit trails and basic compliance controls (GDPR + India DPDP)
- Provide JD generator that produces client-ready drafts with minimal inputs
- Support passive LinkedIn discovery to expand top-of-funnel beyond Ceipal applicants

### 2.3 Success Metrics
- Time-to-shortlist reduction: 50% within 60 days for at least 10 representative roles
- Qualified shortlist rate improvement: 30% compared to baseline manual process
- Manual effort reduction: 8 hours/week per recruiter
- Candidate response rate increase: 20% through multi-channel outreach


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

### 4.1 Authentication & Access Control
**REQ-001:** The system must support email + password authentication
- **Acceptance Criteria:**
  - Users can register with valid email and strong password (8+ chars, mixed case, numbers, symbols)
  - Password reset functionality via email
  - Session management with secure tokens
  
**REQ-002:** The system must support role-based access control
- **Roles:** Recruiter, Admin, and Client Viewer
- **Permissions:**
  - Recruiters: Full access to jobs, candidates, outreach, JD generation
  - Admins: User management, organization settings, system configuration
  - Client Viewers: Read-only access to assigned shortlists
  
**REQ-003:** Admin user management capabilities
- **Acceptance Criteria:**
  - Invite users via email with role assignment
  - Deactivate/reactivate user accounts
  - Bulk user operations

### 4.2 Ceipal ATS Integration
**REQ-004:** Job and applicant data synchronization
- **Acceptance Criteria:**
  - Fetch job details and all applicants by Job ID
  - Support batch job retrieval
  - Real-time data validation and error handling
  
**REQ-005:** Bidirectional status synchronization
- **Acceptance Criteria:**
  - Write candidate statuses back to Ceipal (configurable per org/job)
  - Support custom status mappings
  - Maintain audit trail of all sync operations
  
**REQ-006:** Sync management and reliability
- **Acceptance Criteria:**
  - On-demand sync by Job ID with progress indicators
  - Graceful handling of API errors and rate limits
  - Retry logic with exponential backoff
  - Background sync cadence (TBD - see Open Questions)

### 4.3 AI-Powered Candidate Ranking
**REQ-007:** Default scoring rubric implementation
- **Scoring Weights:**
  - Skills match: 35%
  - Years of relevant experience: 20%
  - Education: 10%
  - Role/title alignment: 10%
  - Domain/industry match: 10%
  - Recency: 10%
  - Location/availability constraints: 5%
- **Acceptance Criteria:**
  - Generate scores 0-100 for all candidates
  - Weights configurable at organization level
  
**REQ-008:** Threshold-based candidate filtering
- **Acceptance Criteria:**
  - Recruiters can set numeric threshold (0-100, default: 70)
  - Real-time filtering with threshold changes
  - Bulk threshold application across candidates
  
**REQ-009:** Custom job-level ranking instructions
- **Acceptance Criteria:**
  - Text input for custom ranking criteria per job
  - Instructions integrated into LLM prompts
  - Preview mode to test instruction impact
  
**REQ-010:** Explainable AI scoring
- **Acceptance Criteria:**
  - Score breakdown by rubric category
  - Evidence snippets supporting each score
  - Confidence indicators for AI decisions
  
**REQ-011:** LLM provider redundancy
- **Acceptance Criteria:**
  - Primary: OpenAI gpt-5 (when available)
  - Fallback: GPT-4o family
  - Automatic failover with status indicators

### 4.4 Resume Storage & Parsing

13. The system must store original resumes (PDF and DOCX) in an AWS S3 bucket in the Mumbai region.
14. The system must parse resumes into structured JSON (e.g., name, contact, skills, work history, education) using a dedicated parser pipeline plus LLM normalization.
15. The system must store parsed JSON and reference to original file; both should be retrievable.
16. The system must ensure encryption at rest (S3 SSE) and basic PII safeguards.

### 4.5 Database & Search

17. The system must persist applicants, resumes, parsed profiles, jobs, rankings, and outreach logs in a Postgres database hosted on a Hetzner VPS.
18. The system must support vector similarity search (pgvector) for semantic queries.
19. The system must support the following queries: filters (location, skills, years), keyword search, and semantic search.

### 4.6 Candidate Outreach

20. The system must support WhatsApp messaging via Meta WhatsApp Business API and Twilio WhatsApp (provider selectable per org/job).
21. The system must support email sending; initial provider: AWS SES (with DKIM/SPF guidance). Alternative providers may be configured later.
22. The system must support voice outreach via a Voice AI provider; initial provider: Vapi, with an abstraction to allow later support for Retell AI/ElevenLabs.
23. The system must record audit logs for all outreach: channel, timestamp, message template, user, and outcome status.
24. The system must allow basic rate limiting and business-hours windows for outreach.
25. The system must track and store consent status per candidate where applicable.

### 4.7 Client Delivery

26. The system must allow recruiters to email a client-ready shortlist including:
   - Candidate summary, score, and key highlights
   - Resume links (S3 pre-signed URLs) or attached PDFs (configurable)
   - Optional scoring breakdown per candidate
27. The system must optionally provide a client portal view (read-only) to review the shortlist.

### 4.8 JD Generator

28. The system must generate a JD draft using LLMs from inputs: title, seniority, skills, location, compensation range, and domain.
29. The system must output Markdown by default; HTML export is optional.
30. The system must provide tone presets (e.g., formal, concise, sales-focused).

### 4.9 Passive LinkedIn Discovery

31. The system must generate an array of Google Custom Search queries that shard the space to target LinkedIn profile pages only, with intent to yield >100 total results when paginated.
32. The system must scrape public LinkedIn profile pages discovered (subject to ToS risks), using Playwright with proxy rotation.
33. The system must extract key fields (e.g., name, headline/title, location, current company, recent roles, education, key skills, profile URL, contact if public) and rank profiles using the same rubric.
34. The system must merge de-duplicated scraped profiles into search results and support the same outreach flow.

### 4.10 Observability & Audit

35. The system must log major API calls, AI prompts (with redaction/hashing for sensitive segments), and model responses metadata.
36. The system must provide an audit trail per candidate and per job.
37. The system must support export of logs on request.

### 4.11 Security & Compliance

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


## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Ceipal API rate limiting | High | Medium | Implement exponential backoff, request queuing, and caching |
| LLM provider outages | High | Low | Multi-provider fallback strategy, local model backup |
| Resume parsing accuracy | Medium | Medium | Multi-stage parsing pipeline with human review workflow |
| LinkedIn scraping blocks | Medium | High | Proxy rotation, rate limiting, alternative enrichment APIs |

### 8.2 Business Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Poor AI ranking quality | High | Medium | Extensive testing, human feedback loop, rubric refinement |
| Compliance violations | High | Low | Regular legal review, built-in privacy controls |
| Low user adoption | Medium | Medium | Comprehensive training, phased rollout, feedback integration |

### 8.3 Security & Privacy Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Data breach | High | Low | Encryption at rest/transit, access controls, audit logging |
| GDPR/DPDP violations | High | Low | Privacy by design, consent management, data retention policies |
| API key exposure | Medium | Low | Secure secret management, key rotation, environment isolation |


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

