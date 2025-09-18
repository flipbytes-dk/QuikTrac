import { hashPassword, verifyPassword } from './hash'

describe('hash', () => {
  it('hashes and verifies passwords', async () => {
    const pwd = 'S3cureP@ss!'
    const hash = await hashPassword(pwd)
    expect(hash).toBeTruthy()
    expect(hash).not.toEqual(pwd)

    expect(await verifyPassword(pwd, hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
