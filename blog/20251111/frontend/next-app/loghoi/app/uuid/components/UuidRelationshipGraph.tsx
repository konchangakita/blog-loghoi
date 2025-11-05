'use client'

import { useEffect, useRef } from 'react'

interface UuidNode {
  id: string
  name: string
  type: string
  x?: number
  y?: number
}

interface UuidLink {
  source: string
  target: string
  type: string
}

interface UuidRelationshipGraphProps {
  mainUuid: string
  mainName: string
  mainType: string
  relatedData: Record<string, any[]>
  entityName: Record<string, string>
}

export default function UuidRelationshipGraph({
  mainUuid,
  mainName,
  mainType,
  relatedData,
  entityName
}: UuidRelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current
    const width = 800
    const height = 400
    const centerX = width / 2
    const centerY = height / 2

    // SVGをクリア
    svg.innerHTML = ''

    // メインUUIDノード
    const mainNode: UuidNode = {
      id: mainUuid,
      name: mainName,
      type: mainType,
      x: centerX,
      y: centerY
    }

    // 関連ノードを生成
    const nodes: UuidNode[] = [mainNode]
    const links: UuidLink[] = []

    let angle = 0
    const radius = 150

    Object.entries(relatedData).forEach(([entityType, entities]) => {
      if (entities.length === 0) return

      const angleStep = (2 * Math.PI) / entities.length
      
      entities.forEach((entity, index) => {
        const nodeAngle = angle + (index * angleStep)
        const x = centerX + radius * Math.cos(nodeAngle)
        const y = centerY + radius * Math.sin(nodeAngle)

        const node: UuidNode = {
          id: entity.uuid,
          name: entity.name,
          type: entityType,
          x,
          y
        }

        nodes.push(node)

        // メインノードとのリンク
        links.push({
          source: mainUuid,
          target: entity.uuid,
          type: entityType
        })
      })

      angle += angleStep * entities.length
    })

    // ノードを描画
    nodes.forEach((node) => {
      const isMain = node.id === mainUuid
      const color = isMain ? '#3b82f6' : getTypeColor(node.type)
      const radius = isMain ? 20 : 15

      // ノードの円
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', node.x!.toString())
      circle.setAttribute('cy', node.y!.toString())
      circle.setAttribute('r', radius.toString())
      circle.setAttribute('fill', color)
      circle.setAttribute('stroke', '#374151')
      circle.setAttribute('stroke-width', '2')
      svg.appendChild(circle)

      // ノードのラベル
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', node.x!.toString())
      text.setAttribute('y', (node.y! + radius + 15).toString())
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('font-size', '12')
      text.setAttribute('fill', '#374151')
      text.textContent = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name
      svg.appendChild(text)

      // タイプラベル
      const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      typeText.setAttribute('x', node.x!.toString())
      typeText.setAttribute('y', (node.y! + radius + 30).toString())
      typeText.setAttribute('text-anchor', 'middle')
      typeText.setAttribute('font-size', '10')
      typeText.setAttribute('fill', '#6b7280')
      typeText.textContent = entityName[node.type] || node.type
      svg.appendChild(typeText)
    })

    // リンクを描画
    links.forEach((link) => {
      const sourceNode = nodes.find(n => n.id === link.source)
      const targetNode = nodes.find(n => n.id === link.target)
      
      if (!sourceNode || !targetNode) return

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', sourceNode.x!.toString())
      line.setAttribute('y1', sourceNode.y!.toString())
      line.setAttribute('x2', targetNode.x!.toString())
      line.setAttribute('y2', targetNode.y!.toString())
      line.setAttribute('stroke', '#9ca3af')
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '5,5')
      svg.appendChild(line)
    })

  }, [mainUuid, mainName, mainType, relatedData, entityName])

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      vmlist: '#10b981',      // 緑
      vglist: '#f59e0b',      // オレンジ
      vflist: '#8b5cf6',      // 紫
      sharelist: '#ef4444',   // 赤
      sclist: '#06b6d4'       // シアン
    }
    return colors[type] || '#6b7280'
  }

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width="800"
        height="400"
        className="border rounded-lg bg-white"
        style={{ backgroundColor: 'white' }}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-sm">メインUUID</span>
        </div>
        {Object.keys(relatedData).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: getTypeColor(type) }}
            ></div>
            <span className="text-sm">{entityName[type] || type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
