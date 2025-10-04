'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface UuidListTableProps {
  entity: Record<string, any>
}

export default function UuidListTable({ entity }: UuidListTableProps) {
  const searchParams = useSearchParams()

  if (!entity || Object.keys(entity).length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        データがありません
      </div>
    )
  }

  const entityArray = Object.values(entity)

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>UUID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entityArray.map((item: any, index: number) => (
            <tr key={index}>
              <td className="font-medium">{item.name || 'N/A'}</td>
              <td className="font-mono text-sm">{item.uuid || 'N/A'}</td>
              <td>
                <Link
                  href={`/uuid/${item.uuid}?${new URLSearchParams({
                    pcip: searchParams.get('pcip') || '',
                    cluster: searchParams.get('cluster') || '',
                    prism: searchParams.get('prism') || '',
                  }).toString()}`}
                  className="btn btn-primary btn-sm"
                >
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

