import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('p-2', 'p-4', false && 'hidden')).toBe('p-4')
  })
})
