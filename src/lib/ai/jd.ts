export type Tone = 'neutral' | 'friendly' | 'formal'

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

// All JD prompt logic has been moved to src/lib/ai/prompts.ts for centralized management
// This file now only exports the types and re-exports the helper function
export { buildJDMessages as buildJDPrompt } from '@/lib/ai/prompts'