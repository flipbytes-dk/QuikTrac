import { buildJDMessages, type JDInput } from '@/lib/ai/prompts'
import { getEnv } from '@/lib/env'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function chatComplete(messages: ChatMessage[], models?: string[]) {
  // Use provided models or fall back to environment defaults
  const env = getEnv()
  const defaultModels = [
    env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    'gpt-4o' // Always have a fallback
  ].filter(Boolean)
  const modelsToTry = models || defaultModels

  let lastErr: unknown
  for (const m of modelsToTry) {
    try {
      return await callOpenAI(messages, m)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('OpenAI call failed')
}

async function callOpenAI(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], model: string) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${txt}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim?.()
  if (!text) throw new Error('No content from OpenAI')
  return text as string
}

export async function generateJD(input: JDInput): Promise<string> {
  const messages = buildJDMessages(input)

  // Use JD-specific model or fall back to default models
  const env = getEnv()
  const models = [
    env.OPENAI_JD_MODEL || env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    'gpt-4o' // Always have a fallback
  ].filter(Boolean)

  let lastErr: unknown
  for (const m of models) {
    try {
      return await callOpenAI(messages, m)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('OpenAI call failed')
}
