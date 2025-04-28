import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { EntityProvider } from '@/contexts/EntityContext'
import { RPCProvider } from '@/contexts/RPCContext'

export const metadata: Metadata = {
  title: 'Solana Forensics',
  description: 'Advanced Solana blockchain analysis tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <RPCProvider>
            <EntityProvider>
              {children}
              <Toaster />
            </EntityProvider>
          </RPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}