import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { GoalPrompt } from '@/components/ui/GoalPrompt'
import { Nav } from '@/components/ui/Nav'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'GoalOS',
  description:
    'A state engine for achieving long-term goals through graph-based reasoning',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans">
        <Providers>
          <Nav />
          <main className="flex-1 pb-24">{children}</main>
          <GoalPrompt />
        </Providers>
      </body>
    </html>
  )
}
