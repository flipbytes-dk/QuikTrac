jest.mock('jose', () => {
  class SignJWT {
    private payload: any
    constructor(payload: any) {
      this.payload = payload
    }
    setProtectedHeader() { return this }
    setIssuedAt() { return this }
    setExpirationTime() { return this }
    async sign() { return `signed.${this.payload.sub || 'anon'}` }
  }
  return {
    SignJWT,
    jwtVerify: async (token: string) => {
      const sub = token.startsWith('signed.') ? token.slice(7) : 'anon'
      return { payload: { sub, role: 'admin' } }
    },
  }
})

import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from './jwt'

describe('jwt', () => {
  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = 'ACCESS-TEST-SECRET'
    process.env.REFRESH_TOKEN_SECRET = 'REFRESH-TEST-SECRET'
    process.env.ACCESS_TOKEN_TTL = '15m'
    process.env.REFRESH_TOKEN_TTL = '1d'
  })

  it('signs and verifies access token with role claim', async () => {
    const token = await signAccessToken({ sub: 'user1', role: 'admin' })
    expect(typeof token).toBe('string')
    const payload = await verifyAccessToken(token)
    expect(payload.sub).toBe('user1')
    expect(payload.role).toBe('admin')
  })

  it('signs and verifies refresh token', async () => {
    const token = await signRefreshToken({ sub: 'user2' })
    const payload = await verifyRefreshToken(token)
    expect(payload.sub).toBe('user2')
  })
})
