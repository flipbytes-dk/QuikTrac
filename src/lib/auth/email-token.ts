import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const enc = new TextEncoder()

function getEmailSecret() {
  const secret = process.env.EMAIL_TOKEN_SECRET
  if (!secret) throw new Error('EMAIL_TOKEN_SECRET not set')
  return secret
}

export type EmailTokenPurpose = 'verify' | 'reset' | 'invite'

export interface EmailTokenClaims extends JWTPayload {
  purpose: EmailTokenPurpose
  email: string
  userId?: string
}

export async function signEmailToken(payload: EmailTokenClaims, ttl: string) {
  const secret = getEmailSecret()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(enc.encode(secret))
}

export async function verifyEmailToken(token: string): Promise<EmailTokenClaims> {
  const secret = getEmailSecret()
  const { payload } = await jwtVerify(token, enc.encode(secret))
  return payload as EmailTokenClaims
}
