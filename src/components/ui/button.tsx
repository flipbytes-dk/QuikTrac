import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2487FE] focus-visible:ring-offset-2 focus:ring-2 focus:ring-[#2487FE] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-[hsl(var(--background))] gap-2 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#2487FE] text-white hover:bg-[#1d6fd1] hover:shadow-lg active:bg-[#1865c4]',
        secondary:
          'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/90',
        outline:
          'border border-[#172233] bg-transparent text-[#172233] hover:bg-[#2487FE]/5 hover:border-[#2487FE] hover:text-[#2487FE]',
        ghost: 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
        link: 'text-[#2487FE] underline-offset-4 hover:underline hover:text-[#1d6fd1]',
        destructive:
          'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
