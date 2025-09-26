import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const enc = new TextEncoder()

function getSecrets() {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured: set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET')
  }
  const accessTtl = process.env.ACCESS_TOKEN_TTL || '100y'
  const refreshTtl = process.env.REFRESH_TOKEN_TTL || '7d'
  return { accessSecret, refreshSecret, accessTtl, refreshTtl }
}

export type RoleName = 'admin' | 'recruiter' | 'client'

export interface AccessClaims extends JWTPayload {
  sub: string // user id
  role: RoleName
}

export async function signAccessToken(payload: AccessClaims) {
  const { accessSecret, accessTtl } = getSecrets()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(accessTtl)
    .sign(enc.encode(accessSecret))
}

export async function signRefreshToken(payload: JWTPayload) {
  const { refreshSecret, refreshTtl } = getSecrets()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(refreshTtl)
    .sign(enc.encode(refreshSecret))
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { accessSecret } = getSecrets()
  const { payload } = await jwtVerify(token, enc.encode(accessSecret))
  return payload as AccessClaims
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { refreshSecret } = getSecrets()
  const { payload } = await jwtVerify(token, enc.encode(refreshSecret))
  return payload
}
