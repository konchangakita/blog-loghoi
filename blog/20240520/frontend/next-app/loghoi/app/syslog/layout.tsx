import type { Metadata } from 'next'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'syslog - Log hoihoi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
