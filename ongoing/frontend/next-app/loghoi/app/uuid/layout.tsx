import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UUID Explorer - LogHoi',
  description: 'UUID Explorer for Nutanix cluster analysis',
}

export default function UuidLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-base-100">
      {children}
    </div>
  )
}





