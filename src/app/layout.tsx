import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QuikTrac',
  description: 'Recruiting accelerator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-dvh bg-white text-black dark:bg-black dark:text-white`}>{children}</body>
    </html>
  )
}
