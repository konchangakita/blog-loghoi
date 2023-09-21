import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'gatekeeper - Log hoihoi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <div>{children}</div>
  )
}
