// Runtime-safe environment loader without external deps
// - Does not throw on import
// - Provides helpers to validate required keys at runtime
// - Masks secrets when logging

export type WhatsappProvider = 'meta' | 'twilio'

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production'

  // Database
  DATABASE_URL: string

  // OpenAI
  OPENAI_API_KEY: string

  // Ceipal
  CEIPAL_CLIENT_ID: string
  CEIPAL_CLIENT_SECRET: string
  CEIPAL_USERNAME: string
  CEIPAL_PASSWORD: string
  CEIPAL_BASE_URL?: string

  // Google CSE
  GOOGLE_CSE_KEY: string
  GOOGLE_CSE_CX: string

  // AWS (S3/SES)
  AWS_REGION: string // e.g., ap-south-1
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  S3_BUCKET: string
  S3_KMS_KEY_ID?: string
  SES_FROM_EMAIL: string

  // WhatsApp
  WHATSAPP_PROVIDER?: WhatsappProvider
  // Meta WhatsApp
  META_WHATSAPP_ACCESS_TOKEN?: string
  META_WHATSAPP_PHONE_NUMBER_ID?: string
  META_WHATSAPP_BUSINESS_ACCOUNT_ID?: string
  // Twilio WhatsApp
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_WHATSAPP_FROM?: string

  // Vapi
  VAPI_API_KEY?: string

  // Scraper/Proxy (optional)
  PROXY_URL?: string
}

const boolean = (v: any) => (typeof v === 'string' ? v.toLowerCase() === 'true' : !!v)

function mask(value: string | undefined, keep: number = 4): string {
  if (!value) return ''
  if (value.length <= keep) return '*'.repeat(value.length)
  return `${value.slice(0, keep)}${'*'.repeat(Math.max(0, value.length - keep))}`
}

function readRaw(): Partial<Env> {
  const env = process.env
  return {
    NODE_ENV: (env.NODE_ENV as Env['NODE_ENV']) || 'development',

    DATABASE_URL: env.DATABASE_URL,

    OPENAI_API_KEY: env.OPENAI_API_KEY,

    CEIPAL_CLIENT_ID: env.CEIPAL_CLIENT_ID,
    CEIPAL_CLIENT_SECRET: env.CEIPAL_CLIENT_SECRET,
    CEIPAL_USERNAME: env.CEIPAL_USERNAME,
    CEIPAL_PASSWORD: env.CEIPAL_PASSWORD,
    CEIPAL_BASE_URL: env.CEIPAL_BASE_URL,

    GOOGLE_CSE_KEY: env.GOOGLE_CSE_KEY,
    GOOGLE_CSE_CX: env.GOOGLE_CSE_CX,

    AWS_REGION: env.AWS_REGION,
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET: env.S3_BUCKET,
    S3_KMS_KEY_ID: env.S3_KMS_KEY_ID,
    SES_FROM_EMAIL: env.SES_FROM_EMAIL,

    WHATSAPP_PROVIDER: env.WHATSAPP_PROVIDER as WhatsappProvider,

    META_WHATSAPP_ACCESS_TOKEN: env.META_WHATSAPP_ACCESS_TOKEN,
    META_WHATSAPP_PHONE_NUMBER_ID: env.META_WHATSAPP_PHONE_NUMBER_ID,
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,

    TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: env.TWILIO_WHATSAPP_FROM,

    VAPI_API_KEY: env.VAPI_API_KEY,

    PROXY_URL: env.PROXY_URL,
  }
}

export type EnvKey = keyof Env

export interface EnvValidationResult {
  env: Partial<Env>
  missing: EnvKey[]
  problems: string[]
}

export function validateEnv(requiredKeys: EnvKey[]): EnvValidationResult {
  const raw = readRaw()
  const missing: EnvKey[] = []
  const problems: string[] = []

  for (const key of requiredKeys) {
    const value = raw[key]
    const isMissing = value === undefined || value === null || String(value).trim() === ''
    if (isMissing) missing.push(key)
  }

  // Conditional requirements based on provider selection
  if (raw.WHATSAPP_PROVIDER === 'meta') {
    ;(['META_WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_PHONE_NUMBER_ID'] as EnvKey[]).forEach(
      (k) => {
        if (!raw[k]) missing.push(k)
      }
    )
  }
  if (raw.WHATSAPP_PROVIDER === 'twilio') {
    ;(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'] as EnvKey[]).forEach(
      (k) => {
        if (!raw[k]) missing.push(k)
      }
    )
  }

  // Basic format checks
  if (raw.SES_FROM_EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.SES_FROM_EMAIL)) {
    problems.push('SES_FROM_EMAIL must be a valid email')
  }
  if (raw.AWS_REGION && !/^[a-z]{2}-[a-z]+-\d$/.test(raw.AWS_REGION)) {
    problems.push('AWS_REGION should look like ap-south-1')
  }

  return { env: raw, missing, problems }
}

export function assertEnv(requiredKeys: EnvKey[]): Env {
  const { env, missing, problems } = validateEnv(requiredKeys)
  if (missing.length || problems.length) {
    const safePairs = Object.entries(env).map(([k, v]) => `${k}=${mask(String(v || ''))}`)
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}` : undefined,
      problems.length ? `Problems: ${problems.join('; ')}` : undefined,
      `Loaded (masked): ${safePairs.join(' ')}`,
    ]
      .filter(Boolean)
      .join('\n')
    throw new Error(`Environment validation failed\n${details}`)
  }
  return env as Env
}

export function getEnv(): Partial<Env> {
  return readRaw()
}

export const isProd = () => process.env.NODE_ENV === 'production'
