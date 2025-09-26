/**
 * 🤖 CENTRALIZED AI PROMPTS CONFIGURATION
 *
 * This file contains all AI prompts used throughout the QuikTrac application.
 * Edit prompts here to maintain consistency and make updates easier.
 */

import type { Tone } from './jd'
import type { CandidateInput } from './ranking'

// =============================================================================
// 🎯 CANDIDATE RANKING PROMPTS
// =============================================================================

export const RANKING_PROMPTS = {
  system: `You are a recruiting copilot.`,

  /**
   * LinkedIn-specific candidate evaluation prompt with 8-criteria rubric
   * Evaluates LinkedIn profiles on a 0-10 scale based on job requirements
   */
  linkedinUserTemplate: (jd: string, instructions: string | undefined, candidate: CandidateInput) => {
    const payload = { job_description: jd, instructions: instructions ?? null, candidate }
    return `Return STRICT JSON only. Do not include markdown fences or commentary.

INPUT:
${JSON.stringify(payload, null, 2)}

SPEC:
${RANKING_PROMPTS.linkedinSpec}`
  },

  /**
   * Resume-specific candidate evaluation prompt with 8-criteria rubric
   * Evaluates parsed resume data on a 0-10 scale based on job requirements
   */
  resumeUserTemplate: (jd: string, instructions: string | undefined, candidate: CandidateInput) => {
    const payload = { job_description: jd, instructions: instructions ?? null, candidate }
    return `Return STRICT JSON only. Do not include markdown fences or commentary.

INPUT:
${JSON.stringify(payload, null, 2)}

SPEC:
${RANKING_PROMPTS.resumeSpec}`
  },

  /**
   * @deprecated Use linkedinUserTemplate instead
   */
  userTemplate: (jd: string, instructions: string | undefined, candidate: CandidateInput) => {
    const payload = { job_description: jd, instructions: instructions ?? null, candidate }
    return `Return STRICT JSON only. Do not include markdown fences or commentary.

INPUT:
${JSON.stringify(payload, null, 2)}

SPEC:
${RANKING_PROMPTS.linkedinSpec}`
  },

  linkedinSpec: `You are a recruiting copilot. Given a \`job_description\` and one candidate record harvested from LinkedIn, you must:
1) score the candidate's fit on a 0-10 scale using the rubric below,
2) explain the score briefly but concretely,
3) if the score > 5, draft a short, highly personalized email to the candidate.

---

### Inputs
- \`job_description\` (string of the role/JD).
- \`instructions\` are the custom instructions given by the user that MUST BE GIVEN HIGHEST IMPORTANCE.
- \`candidate\` (object) with fields (any may be missing):
  - \`linkedin_url\`, \`full_name\`, \`first_name\`, \`last_name\`, \`headline\`, \`about\`, \`email\`, \`phone\`,
  - \`current_title\`, \`current_company\`, \`current_duration_years\`,
  - \`location\`, \`country\`,
  - \`connections\`, \`followers\`,
  - \`skills_top\` (array of strings), \`skills_all\` (array of strings),
  - \`companies_worked\` (array of {company, title, start, end}),
  - \`roles_timeline\` (array with titles, companies, dates, responsibilities if available),
  - \`educations\` (array),
  - \`certificates\` (array),
  - \`projects\` (array),
  - \`recommendations_received\` (number), \`recommendations_received_text\` (array/strings).
- \`id\` is the row id of the table

---

### Scoring rubric (100 pts → convert to 0-10)
Score each dimension, sum to 100, then divide by 10 and round to one decimal place. While calculating the scores, you MUST give the highest attention and adherence to the \`instructions\` provided. These instructions could be specifying very stringent requirements regarding a particular skill set, or a location, or other work related requirements and hence you must gauge the candidates on these.

1. **Skill Match (30 pts)**
2. **Role/Domain Relevance (20 pts)**
3. **Recency & Tenure (10 pts)**
4. **Impact Signals (10 pts)**
5. **Education/Certs Alignment (10 pts)**
6. **Leadership/Collaboration (8 pts)**
7. **Location/Work Modality Fit (7 pts)**
8. **Seniority & Scope (5 pts)**

Penalties: -5 critical skills missing; -3 if last relevant exp >5y ago. Cap [0,100]. rating = round(total/10,1).

### Evidence handling
Prefer explicit evidence; if uncertain, say "not evidenced". Missing fields are not penalized unless JD requires them.

### Email drafting (only if rating > 5)
120-220 words, personalized, warm, professional; include subject and to-email if available; adhere to \`instructions\`. You MUST quote their relevant experience for the current job that is being offered.

### Interview questions generation
Generate 5-7 highly specific interview questions that:
1. Test critical skills and technologies mentioned in the job description
2. Explore the candidate's actual project experience from their timeline/companies
3. Dive deep into their specific background (mention actual companies, technologies they've used)
4. Address any gaps, transitions, or interesting aspects in their career
5. Include 1-2 behavioral questions relevant to the role's leadership/collaboration requirements
6. Reference their education, certifications, or notable achievements when relevant
7. Ensure questions are technical enough to assess competency but specific to this candidate's journey

### WhatsApp message drafting (only if rating > 5)
60-120 words, conversational, direct, professional; mention specific aspects of their background that align with the role; include clear next steps; adhere to \`instructions\`.

### Output format (STRICT JSON ONLY)
{
  "overall_rating": 0.0,
  "score_breakdown": {
    "skills_match": 0,
    "role_domain_relevance": 0,
    "recency_tenure": 0,
    "impact_signals": 0,
    "education_certs": 0,
    "leadership_collaboration": 0,
    "location_modality_fit": 0,
    "seniority_scope": 0,
    "penalties": 0
  },
  "justification": "2-5 bullet sentences citing evidence from profile vs JD.",
  "decision": "proceed" | "park" | "reject",
  "highlights_for_recruiter": ["Short bullets for recruiter notes"],
  "outreach_email": {
    "send": true,
    "to": "candidate@email.com or null",
    "subject": "Compelling, specific subject",
    "body": "Personalized email body (120-220 words)",
    "id": "The row number provided in the user message as id"
  },
  "whatsapp_message": {
    "send": true,
    "body": "Personalized WhatsApp message (60-120 words)",
    "id": "The row number provided in the user message as id"
  },
  "questions": [
    "5-7 highly specific interview questions tailored to this candidate's experience and the job requirements"
  ]
}

Return STRICT JSON only, no backticks, no commentary.`,

  resumeSpec: `You are a recruiting copilot. Given a \`job_description\` and one candidate record parsed from a resume, you must:
1) score the candidate's fit on a 0-10 scale using the rubric below,
2) explain the score briefly but concretely,
3) if the score > 5, draft a short, highly personalized email to the candidate.

---

### Inputs
- \`job_description\` (string of the role/JD).
- \`instructions\` are the custom instructions given by the user that MUST BE GIVEN HIGHEST IMPORTANCE.
- \`candidate\` (object) with fields parsed from resume (any may be missing):
  - \`full_name\`, \`first_name\`, \`last_name\`, \`headline\`, \`about\`, \`email\`, \`phone\`,
  - \`current_title\`, \`current_company\`, \`current_duration_years\`,
  - \`location\`, \`country\`,
  - \`skills_top\` (array of key skills extracted from resume), \`skills_all\` (array of all skills),
  - \`companies_worked\` (array of {company, title, start, end}),
  - \`roles_timeline\` (array with titles, companies, dates, responsibilities from work experience),
  - \`educations\` (array of educational qualifications),
  - \`certificates\` (array of certifications and licenses),
  - \`projects\` (array of notable projects),
  - \`titles\` (array of job titles held throughout career),
  - \`totalExpMonths\` (total experience in months).
- \`id\` is the row id of the applicant record

---

### Scoring rubric (100 pts → convert to 0-10)
Score each dimension, sum to 100, then divide by 10 and round to one decimal place. While calculating the scores, you MUST give the highest attention and adherence to the \`instructions\` provided. These instructions could be specifying very stringent requirements regarding a particular skill set, or a location, or other work related requirements and hence you must gauge the candidates on these.

1. **Skill Match (30 pts)** - How well do the candidate's skills align with job requirements
2. **Role/Domain Relevance (20 pts)** - Relevance of previous roles and industry experience
3. **Recency & Tenure (10 pts)** - How recent and stable is their relevant experience
4. **Impact Signals (10 pts)** - Evidence of achievements, impact, and career progression
5. **Education/Certs Alignment (10 pts)** - Educational background and certifications fit
6. **Leadership/Collaboration (8 pts)** - Evidence of leadership and teamwork from resume
7. **Location/Work Modality Fit (7 pts)** - Geographic and work arrangement compatibility
8. **Seniority & Scope (5 pts)** - Level of responsibility and scope of work

Penalties: -5 critical skills missing; -3 if last relevant exp >5y ago. Cap [0,100]. rating = round(total/10,1).

### Evidence handling
Base scoring on explicit evidence from resume data; if uncertain about a criteria, say "not evidenced in resume". Missing fields are not penalized unless JD specifically requires them.

### Email drafting (only if rating > 5)
120-220 words, personalized based on resume content, warm, professional; include subject and to-email if available; adhere to \`instructions\`. You MUST quote their relevant experience for the current job that is being offered.

### Interview questions generation
Generate 5-7 highly specific interview questions that:
1. Test critical skills and technologies mentioned in the job description
2. Explore the candidate's actual work experience from their resume timeline
3. Dive deep into their specific background (mention actual companies, technologies, projects)
4. Address any gaps, transitions, or interesting aspects in their career progression
5. Include 1-2 behavioral questions relevant to the role's requirements
6. Reference their education, certifications, or notable achievements when relevant
7. Ensure questions are technical enough to assess competency but specific to their resume

### WhatsApp message drafting (only if rating > 5)
60-120 words, conversational, direct, professional; mention specific aspects of their background from resume that align with the role; include clear next steps; adhere to \`instructions\`. 

### Output format (STRICT JSON ONLY)
{
  "overall_rating": 0.0,
  "score_breakdown": {
    "skills_match": 0,
    "role_domain_relevance": 0,
    "recency_tenure": 0,
    "impact_signals": 0,
    "education_certs": 0,
    "leadership_collaboration": 0,
    "location_modality_fit": 0,
    "seniority_scope": 0,
    "penalties": 0
  },
  "justification": "2-5 bullet sentences citing evidence from resume vs JD.",
  "decision": "proceed" | "park" | "reject",
  "highlights_for_recruiter": ["Short bullets for recruiter notes"],
  "outreach_email": {
    "send": true,
    "to": "candidate@email.com or null",
    "subject": "Compelling, specific subject",
    "body": "Personalized email body (120-220 words) which must quote the candidate's relevant experience for the job."
  },
  "whatsapp_message": {
    "send": true,
    "body": "Personalized WhatsApp message (60-120 words)"
  },
  "questions": [
    "5-7 highly specific interview questions tailored to this candidate's experience and the job requirements"
  ]
}

Return STRICT JSON only, no backticks, no commentary.`
} as const

// =============================================================================
// 📝 JOB DESCRIPTION GENERATION PROMPTS
// =============================================================================

export interface JDInput {
  title: string
  seniority?: string
  skills?: string[]
  location?: string
  comp?: string
  domain?: string
  tone?: Tone
  additionalInstructions?: string
}

export const JD_PROMPTS = {
  /**
   * System prompt for JD generation - sets tone and formatting guidelines
   */
  systemTemplate: (tone: Tone = 'neutral') =>
    `You are a recruiting assistant that writes clear, inclusive, and scannable Job Descriptions as Markdown.
- Keep the voice ${tone}. Avoid fluff, clichés, and bias.
- Prefer concise bullets (5-8 per section). Use simple language.
- Include only what the user provides about compensation/company. Do not fabricate specifics.`,

  /**
   * User prompt template for JD generation with structured input
   */
  userTemplate: (input: JDInput) => {
    const skillsList = (input.skills || []).filter(Boolean).join(', ')

    const additionalInstructionsSection = input.additionalInstructions
      ? `

Additional Instructions from Client/Requirements:
${input.additionalInstructions}

Please incorporate these specific requirements and instructions into the job description as appropriate.`
      : ''

    return `Compose a Job Description with the following data:
- Title: ${input.title}
- Seniority: ${input.seniority || 'Not specified'}
- Domain: ${input.domain || 'Not specified'}
- Location: ${input.location || 'Remote/Onsite as applicable'}
- Compensation: ${input.comp || 'Not disclosed'}
- Skills: ${skillsList || 'Not specified'}${additionalInstructionsSection}

Sections (Markdown):
1. About the Role
2. Responsibilities (bulleted)
3. Requirements (bulleted)
4. Nice to Have (bulleted)
5. Compensation (exactly as provided)
6. About the Company (generic if not provided; keep brief)

Formatting:
- Use H1 for the title ('${input.title}').
- Use H2 for section headings. No tables. No HTML.
- Keep to ~400–650 words total.`
  }
} as const

// =============================================================================
// 🔍 LINKEDIN QUERY GENERATION PROMPTS
// =============================================================================

export const LINKEDIN_PROMPTS = {
  system: `You are an expert at formulating Google search queries for the Google Custom Search JSON API.`,

  /**
   * LinkedIn query generation prompt for optimized profile discovery
   * Generates 8-10 targeted search queries with smart sharding strategy
   */
  userTemplate: (jobDescription: string, customInstructions?: string) =>
    `GOAL
- Given a \`job_description\` and optional \`custom_instructions\`, produce an ARRAY of sub-queries that shard the search space to yield MORE THAN 100 total LinkedIn profile results when each sub-query is paginated.
- Every query MUST target LinkedIn profile pages only.

INPUTS
- job_description: <string>
- custom_instructions: <string|optional>

WHAT TO EXTRACT (from inputs)
1) ROLE/TITLES: canonicalize and group into 2-3 buckets (e.g., ["AI Architect" OR "ML Architect" OR "Gen AI Architect"], ["Cloud AI Architect"]).
2) SKILLS/PLATFORMS: 2-3 buckets (e.g., ["OCI Data Science" OR "OCI AI Services" OR "Gen AI Agents"], ["LangGraph" OR CrewAI OR AutoGen], [RAG OR "Vector Database" OR 23ai OR ATP]).
3) LOCATIONS: up to 6 most relevant (cities/regions/country/remote keywords). If India-based (e.g., Noida/Delhi NCR/Gurugram/India), PREFER those synonyms.
4) EMPLOYMENT/CONSTRAINTS: keep as GLOBAL filters ONLY if compatible with location/context.

MANDATORY FILTERS (include in EVERY query)
- site:linkedin.com/in
- Exclude non-profile sections to cut noise:
  -inurl:/jobs/ -inurl:/company/ -inurl:/learning/ -inurl:/salary/ -inurl:/school/

SHARDING STRATEGY
- Combine: (1 title bucket) AND (1 skill bucket) AND (1 location)
- Aim for 8-10 queries total (cap at 15). Prefer breadth across locations first, then titles, then skills.
- Avoid near-duplicates.
- Keep boolean operators UPPERCASE and wrap multi-word terms in quotes.

QUERY QUALITY RULES
- CONDITIONAL constraints:
  - If location implies India (e.g., Noida, Delhi NCR, Gurugram, India), DO NOT include US work authorization terms ("Green Card", "US citizen", EAD/CPT/OPT). Remove them.
  - Only include work-authorization terms if the JD explicitly requires them and they are compatible with the location.
  - Avoid generic soft constraints like "executive communication" unless the JD depends on them; prefer high-signal tech terms from the JD.
- Expand common synonyms/abbreviations.
- Keep queries under ~256 chars; split into more shards if needed.

OUTPUT FORMAT (STRICT)
- Return ONLY a JSON array of strings.
- No keys, no objects, no comments, no trailing text.
- Each array element is one complete Google query string ready to send as q=... (no URL encoding).
- Deduplicate queries within the array.

NOW DO IT
- Use the rules above to extract buckets and emit 8-10 high-coverage sub-queries as a JSON array of strings based on the provided job_description and custom_instructions.

job_description:
---
${jobDescription}
---

custom_instructions:
---
${customInstructions || ''}
---`
} as const

// =============================================================================
// 🎤 INTERVIEW QUESTIONS GENERATION PROMPTS
// =============================================================================

export const INTERVIEW_PROMPTS = {
  system: `You are an expert technical interviewer and recruiting specialist.`,

  /**
   * Standalone interview questions generation for specific candidates
   */
  userTemplate: (jd: string, instructions: string | undefined, candidate: CandidateInput) => {
    const payload = { job_description: jd, instructions: instructions ?? null, candidate }
    return `Generate 5-7 highly specific interview questions for this candidate.

INPUT:
${JSON.stringify(payload, null, 2)}

REQUIREMENTS:
1. Test critical skills and technologies mentioned in the job description
2. Explore the candidate's actual project experience from their timeline/companies
3. Dive deep into their specific background (mention actual companies, technologies they've used)
4. Address any gaps, transitions, or interesting aspects in their career
5. Include 1-2 behavioral questions relevant to the role's leadership/collaboration requirements
6. Reference their education, certifications, or notable achievements when relevant
7. Ensure questions are technical enough to assess competency but specific to this candidate's journey

Give highest priority to the custom instructions provided.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "questions": [
    "5-7 highly specific interview questions tailored to this candidate's experience and the job requirements"
  ]
}

Return STRICT JSON only, no backticks, no commentary.`
  }
} as const

// =============================================================================
// 📱 WHATSAPP MESSAGE GENERATION PROMPTS
// =============================================================================

export const WHATSAPP_PROMPTS = {
  system: `You are an expert at crafting personalized, professional WhatsApp messages for recruitment outreach.`,

  /**
   * Standalone WhatsApp message generation for specific candidates
   */
  userTemplate: (jd: string, instructions: string | undefined, candidate: CandidateInput, jobCode?: string) => {
    const payload = { job_description: jd, instructions: instructions ?? null, candidate, job_code: jobCode }
    return `Craft a personalized WhatsApp message for this candidate.

INPUT:
${JSON.stringify(payload, null, 2)}

REQUIREMENTS:
1. 60-120 words, conversational but professional tone
2. Mention specific aspects of their background that align with the role
3. Reference actual companies, technologies, or experiences from their profile
4. Include clear next steps (asking for CTC, notice period, etc.)
5. Use their name and be warm but direct
6. Adhere to any custom instructions provided

Give highest priority to the custom instructions provided.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "message": "Personalized WhatsApp message (60–120 words)"
}

Return STRICT JSON only, no backticks, no commentary.`
  }
} as const

// =============================================================================
// 🚀 FUTURE PROMPTS
// =============================================================================

// TODO: Add prompts for other AI features as they're developed:
// - Email personalization prompts
// - Resume parsing prompts
// - Outreach message optimization prompts

// =============================================================================
// 📚 PROMPT UTILITIES
// =============================================================================

/**
 * Helper function to build LinkedIn ranking prompt messages
 */
export function buildLinkedInRankingMessages(jd: string, instructions: string | undefined, candidate: CandidateInput) {
  return [
    { role: 'system' as const, content: RANKING_PROMPTS.system },
    { role: 'user' as const, content: RANKING_PROMPTS.linkedinUserTemplate(jd, instructions, candidate) }
  ]
}

/**
 * Helper function to build resume ranking prompt messages
 */
export function buildResumeRankingMessages(jd: string, instructions: string | undefined, candidate: CandidateInput) {
  return [
    { role: 'system' as const, content: RANKING_PROMPTS.system },
    { role: 'user' as const, content: RANKING_PROMPTS.resumeUserTemplate(jd, instructions, candidate) }
  ]
}

/**
 * @deprecated Use buildLinkedInRankingMessages or buildResumeRankingMessages instead
 */
export function buildRankingMessages(jd: string, instructions: string | undefined, candidate: CandidateInput) {
  return [
    { role: 'system' as const, content: RANKING_PROMPTS.system },
    { role: 'user' as const, content: RANKING_PROMPTS.userTemplate(jd, instructions, candidate) }
  ]
}

/**
 * Helper function to build JD generation prompt messages
 */
export function buildJDMessages(input: JDInput) {
  const tone = input.tone || 'neutral'
  return [
    { role: 'system' as const, content: JD_PROMPTS.systemTemplate(tone) },
    { role: 'user' as const, content: JD_PROMPTS.userTemplate(input) }
  ]
}

/**
 * Helper function to build LinkedIn query prompt messages
 */
export function buildLinkedInMessages(jobDescription: string, customInstructions?: string) {
  return [
    { role: 'system' as const, content: LINKEDIN_PROMPTS.system },
    { role: 'user' as const, content: LINKEDIN_PROMPTS.userTemplate(jobDescription, customInstructions) }
  ]
}

/**
 * Helper function to build interview questions prompt messages
 */
export function buildInterviewMessages(jd: string, instructions: string | undefined, candidate: CandidateInput) {
  return [
    { role: 'system' as const, content: INTERVIEW_PROMPTS.system },
    { role: 'user' as const, content: INTERVIEW_PROMPTS.userTemplate(jd, instructions, candidate) }
  ]
}

/**
 * Helper function to build WhatsApp message prompt messages
 */
export function buildWhatsAppMessages(jd: string, instructions: string | undefined, candidate: CandidateInput, jobCode?: string) {
  return [
    { role: 'system' as const, content: WHATSAPP_PROMPTS.system },
    { role: 'user' as const, content: WHATSAPP_PROMPTS.userTemplate(jd, instructions, candidate, jobCode) }
  ]
}