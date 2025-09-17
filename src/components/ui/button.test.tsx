import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Button>Default</Button>)
    const btn = screen.getByRole('button', { name: 'Default' })
    expect(btn.className).toMatch(/bg-\[hsl\(var\(--primary\)\)\]/)

    rerender(<Button variant="destructive">Danger</Button>)
    const danger = screen.getByRole('button', { name: 'Danger' })
    expect(danger.className).toMatch(/var\(--destructive\)/)
  })
})
