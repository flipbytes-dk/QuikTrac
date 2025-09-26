# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
```bash
pnpm install                 # Install dependencies
```

### Development
```bash
pnpm dev                     # Start development server
pnpm build                   # Build for production
pnpm start                   # Start production server
```

### Quality Gates
```bash
pnpm typecheck              # TypeScript type checking
pnpm lint                   # ESLint code linting
pnpm test                   # Run Jest unit tests
pnpm format                 # Format code with Prettier
```

### Database
```bash
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:format          # Format Prisma schema
pnpm migrate:dev            # Run database migrations (dev)
pnpm migrate:deploy         # Deploy migrations (production)
pnpm db:seed                # Seed database
```

### Single Test Execution
```bash
pnpm test -- --testNamePattern="specific test name"
pnpm test src/lib/auth/hash.test.ts  # Run specific test file
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM + pgvector extension
- **Authentication**: JWT-based with refresh tokens
- **UI**: shadcn/ui + Tailwind CSS
- **Email**: Resend
- **AI**: OpenAI (GPT-4o/GPT-5)
- **File Storage**: AWS S3 (ap-south-1)
- **Testing**: Jest + Testing Library

### Application Structure
- **Authentication System**: JWT access tokens (15-30 min) + refresh tokens (7-30 days) stored in httpOnly cookies
- **Multi-tenant**: Role-based access with User/Role models
- **ATS Integration**: Ceipal API for job and applicant import
- **AI-Powered Ranking**: OpenAI-based candidate ranking with rubric scoring
- **Multi-channel Outreach**: WhatsApp (Meta/Twilio), Email (Resend), Voice (Vapi)
- **Resume Processing**: S3 storage + AI parsing to structured profiles
- **Search**: Hybrid search with filters + keyword + semantic (pgvector)

### Key Directories
- `src/app/api/auth/` - Authentication endpoints (login, register, refresh, verify, reset)
- `src/app/api/jd/` - Job description generation
- `src/app/api/outreach/` - Multi-channel outreach endpoints
- `src/lib/auth/` - JWT, hashing, email token utilities
- `src/lib/ai/` - OpenAI integration and AI utilities
- `src/lib/email/` - Resend email service
- `src/lib/db/` - Prisma database client
- `src/lib/security/` - Rate limiting and security utilities

### Environment Configuration
Environment variables are validated at runtime via `src/lib/env.ts`. Core required variables:
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - AI functionality
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` - Email service
- `EMAIL_TOKEN_SECRET` - Email verification/reset tokens
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` - File storage
- `CEIPAL_CLIENT_ID`, `CEIPAL_CLIENT_SECRET`, `CEIPAL_USERNAME`, `CEIPAL_PASSWORD` - ATS integration

### Database Schema
Key models include:
- **User/Role**: Authentication and authorization
- **Job/Applicant**: Core recruiting entities from Ceipal
- **Resume/ParsedProfile**: File storage and AI-parsed structured data
- **Ranking**: AI-generated candidate scores with explanations
- **OutreachLog/Consent**: Multi-channel communication tracking
- **Embedding**: pgvector storage for semantic search
- **AuditLog**: Compliance and audit trails

### Authentication Flow
1. Login generates access + refresh token pair
2. Access token in Authorization header, refresh token in httpOnly cookie
3. Automatic token rotation on refresh for security
4. Email verification and password reset via time-limited JWT tokens
5. Rate limiting on auth endpoints

### Testing Strategy
- Unit tests for core utilities (auth, AI, utilities)
- Jest configuration with jsdom environment
- Path mapping: `@/` → `src/`
- Coverage collection from `src/**/*.{ts,tsx}`

### Code Conventions
- TypeScript strict mode
- ESLint + Prettier for code quality
- Prisma for type-safe database operations
- Environment validation with masked logging for secrets
- Error handling with structured logging for observability

## Visual Development

### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Kill Chrome browser** - Always run `pkill -f chrome` before starting browser automation to avoid conflicts
3. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
4. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
5. **Validate feature implementation** - Ensure the change fulfills the user's specific request
6. **Check acceptance criteria** - Review any provided context files or requirements
7. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
8. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing