import './globals.css'
import { Inter } from 'next/font/google'
import { TokenRefreshProvider } from '@/components/auth/token-refresh-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QuikTrac',
  description: 'Recruiting accelerator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-dvh bg-white text-black dark:bg-black dark:text-white`}>
        <TokenRefreshProvider>
          {children}
        </TokenRefreshProvider>
      </body>
    </html>
  )
}
