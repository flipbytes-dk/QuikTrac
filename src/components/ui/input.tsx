import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-white/70 px-3.5 py-2 text-sm shadow-sm backdrop-blur transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2487FE] focus-visible:ring-offset-2 focus-visible:border-[#2487FE] focus:ring-2 focus:ring-[#2487FE] focus:ring-offset-2 focus:border-[#2487FE] hover:border-[hsl(var(--border))]/80 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-[hsl(var(--background))] dark:bg-zinc-900/50'
      , className)}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
