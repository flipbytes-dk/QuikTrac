// All LinkedIn query prompt logic has been moved to src/lib/ai/prompts.ts for centralized management
// This file now only re-exports the helper function for backwards compatibility
export { buildLinkedInMessages as buildLinkedInQueryPrompt } from '@/lib/ai/prompts'