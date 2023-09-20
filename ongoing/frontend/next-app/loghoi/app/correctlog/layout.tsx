import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'correct log - Log hoihoi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}