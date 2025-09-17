import './globals.css'

export const metadata = {
  title: 'QuikTrac',
  description: 'Recruiting accelerator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-black dark:bg-black dark:text-white">{children}</body>
    </html>
  )
}
