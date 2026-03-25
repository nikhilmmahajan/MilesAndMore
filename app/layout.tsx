import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Almaden Fit AF',
  description: 'Community Fitness Portal — Season 7',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#E8500A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
