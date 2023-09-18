import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'realtimelog - Log hoihoi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
