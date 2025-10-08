import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Log Hoihoi',
  description: 'Nutanix Log Collection & Analysis Platform',
  icons: {
    icon: '/hoihoi.ico',
    shortcut: '/hoihoi.ico',
    apple: '/hoihoi.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  )
}
