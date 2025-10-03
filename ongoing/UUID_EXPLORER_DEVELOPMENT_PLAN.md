# UUID Explorer 開発プラン

## 概要

過去実装（hack23-log-xplorer）をベースに、現在のプロジェクト構造に合わせてUUIDエクスプローラを実装するプランです。

## 参考実装

- **フロントエンド**: https://github.com/konchangakita/hack23-log-xplorer/tree/main/frontend/next-app/log-xplorer/pages/uuid
- **バックエンド**: https://github.com/konchangakita/hack23-log-xplorer/blob/main/backend/flaskr/broker_uuid.py

## 実装方針

### 1. フロントエンド実装
- Next.js 14のApp Routerを使用
- 既存のコンポーネント（`uuidhistory.tsx`, `uuidlisttable.tsx`）を活用
- 過去実装のUI/UXパターンを踏襲

### 2. バックエンド実装
- FastAPIを使用（既存のアーキテクチャに合わせる）
- 既存のElasticsearch機能（`ela.py`）を活用
- 過去実装の検索ロジックを移植

## 実装手順

### Phase 1: フロントエンド基盤構築

#### 1.1 ディレクトリ構造作成
```
/home/nutanix/konchangakita/blog-loghoi/ongoing/frontend/next-app/loghoi/app/uuid/
├── page.tsx                    # UUID一覧ページ
├── layout.tsx                  # UUIDページレイアウト
├── content/
│   ├── [uuid]/
│   │   └── page.tsx           # UUID詳細ページ
│   └── uuid-content.tsx       # UUID一覧コンテンツ
├── components/
│   ├── UuidSearch.tsx         # UUID検索コンポーネント
│   ├── UuidDetailView.tsx     # UUID詳細表示コンポーネント
│   └── UuidRelationView.tsx   # UUID関連性表示コンポーネント
└── hooks/
    └── useUuidApi.ts          # UUID API用カスタムフック
```

#### 1.2 実装ファイル詳細

**`app/uuid/page.tsx`**
```typescript
'use client'
import { useSearchParams } from 'next/navigation'
import UuidContent from './content/uuid-content'
import { getBackendUrl } from '../../lib/getBackendUrl'

export default function UuidPage() {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">UUID Explorer</h1>
      <div className="mb-4">
        <p>PC: {pcip}</p>
        <p>Cluster: {cluster}</p>
        <p>Prism: {prism}</p>
      </div>
      <UuidContent pcip={pcip} cluster={cluster} prism={prism} />
    </div>
  )
}
```

**`app/uuid/layout.tsx`**
```typescript
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
```

**`app/uuid/content/uuid-content.tsx`**
```typescript
'use client'
import { useState, useEffect } from 'react'
import UuidSearch from '../components/UuidSearch'
import UuidListTable from '../../../components/uuidlisttable'
import UuidHistory from '../../../components/uuidhistory'
import { useUuidApi } from '../hooks/useUuidApi'

interface UuidContentProps {
  pcip: string | null
  cluster: string | null
  prism: string | null
}

export default function UuidContent({ pcip, cluster, prism }: UuidContentProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [uuidData, setUuidData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { searchUuids, getAllUuids } = useUuidApi()

  useEffect(() => {
    if (cluster) {
      loadAllUuids()
    }
  }, [cluster])

  const loadAllUuids = async () => {
    setLoading(true)
    try {
      const data = await getAllUuids(cluster!)
      setUuidData(data)
    } catch (error) {
      console.error('Failed to load UUIDs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword)
    setLoading(true)
    try {
      const data = await searchUuids(cluster!, keyword)
      setUuidData(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <UuidSearch onSearch={handleSearch} loading={loading} />
        <div className="mt-6">
          <UuidHistory />
        </div>
      </div>
      <div className="lg:col-span-3">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">UUID List</h2>
            {loading ? (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <UuidListTable entity={uuidData} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**`app/uuid/content/[uuid]/page.tsx`**
```typescript
'use client'
import { useSearchParams, useParams } from 'next/navigation'
import UuidDetailView from '../../components/UuidDetailView'
import UuidRelationView from '../../components/UuidRelationView'
import { useUuidApi } from '../../hooks/useUuidApi'
import { useState, useEffect } from 'react'

export default function UuidDetailPage() {
  const searchParams = useSearchParams()
  const params = useParams()
  const uuid = params.uuid as string
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  const [uuidDetail, setUuidDetail] = useState<any>(null)
  const [relatedUuids, setRelatedUuids] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { getUuidDetail, getRelatedUuids } = useUuidApi()

  useEffect(() => {
    if (uuid && cluster) {
      loadUuidDetail()
      loadRelatedUuids()
    }
  }, [uuid, cluster])

  const loadUuidDetail = async () => {
    setLoading(true)
    try {
      const detail = await getUuidDetail(cluster!, uuid)
      setUuidDetail(detail)
    } catch (error) {
      console.error('Failed to load UUID detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedUuids = async () => {
    try {
      const related = await getRelatedUuids(cluster!, uuid)
      setRelatedUuids(related)
    } catch (error) {
      console.error('Failed to load related UUIDs:', error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <p>PC: {pcip}</p>
        <p>Cluster: {cluster}</p>
        <p>UUID: {uuid}</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <UuidDetailView uuidDetail={uuidDetail} />
          </div>
          <div>
            <UuidRelationView relatedUuids={relatedUuids} />
          </div>
        </div>
      )}
    </div>
  )
}
```

**`app/uuid/hooks/useUuidApi.ts`**
```typescript
import { useState } from 'react'
import { getBackendUrl } from '../../../lib/getBackendUrl'

export const useUuidApi = () => {
  const [loading, setLoading] = useState(false)

  const getAllUuids = async (cluster: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${getBackendUrl()}/api/uuid/list?cluster=${cluster}`)
      if (!response.ok) throw new Error('Failed to fetch UUIDs')
      const data = await response.json()
      return data.uuids || []
    } finally {
      setLoading(false)
    }
  }

  const searchUuids = async (cluster: string, keyword: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${getBackendUrl()}/api/uuid/search?cluster=${cluster}&keyword=${encodeURIComponent(keyword)}`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      return data.uuids || []
    } finally {
      setLoading(false)
    }
  }

  const getUuidDetail = async (cluster: string, uuid: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${getBackendUrl()}/api/uuid/detail?cluster=${cluster}&uuid=${uuid}`)
      if (!response.ok) throw new Error('Failed to fetch UUID detail')
      const data = await response.json()
      return data.detail
    } finally {
      setLoading(false)
    }
  }

  const getRelatedUuids = async (cluster: string, uuid: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/uuid/related?cluster=${cluster}&uuid=${uuid}`)
      if (!response.ok) throw new Error('Failed to fetch related UUIDs')
      const data = await response.json()
      return data.related || []
    } catch (error) {
      console.error('Error fetching related UUIDs:', error)
      return []
    }
  }

  return {
    loading,
    getAllUuids,
    searchUuids,
    getUuidDetail,
    getRelatedUuids
  }
}
```

**`app/uuid/components/UuidSearch.tsx`**
```typescript
'use client'
import { useState } from 'react'

interface UuidSearchProps {
  onSearch: (keyword: string) => void
  loading: boolean
}

export default function UuidSearch({ onSearch, loading }: UuidSearchProps) {
  const [keyword, setKeyword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(keyword)
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">UUID Search</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <input
              type="text"
              placeholder="Search UUID..."
              className="input input-bordered w-full"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-control mt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !keyword.trim()}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**`app/uuid/components/UuidDetailView.tsx`**
```typescript
'use client'

interface UuidDetailViewProps {
  uuidDetail: any
}

export default function UuidDetailView({ uuidDetail }: UuidDetailViewProps) {
  if (!uuidDetail) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">UUID Detail</h2>
          <p>No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">UUID Detail</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <tbody>
              <tr>
                <td className="font-bold">UUID</td>
                <td>{uuidDetail.uuid}</td>
              </tr>
              <tr>
                <td className="font-bold">Name</td>
                <td>{uuidDetail.name}</td>
              </tr>
              <tr>
                <td className="font-bold">Type</td>
                <td>{uuidDetail._index?.replace('uuid_', '')}</td>
              </tr>
              <tr>
                <td className="font-bold">Cluster</td>
                <td>{uuidDetail.cluster_name}</td>
              </tr>
              <tr>
                <td className="font-bold">Timestamp</td>
                <td>{new Date(uuidDetail.timestamp).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h3 className="font-bold mb-2">Raw Data</h3>
          <pre className="bg-base-300 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(uuidDetail, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
```

**`app/uuid/components/UuidRelationView.tsx`**
```typescript
'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface UuidRelationViewProps {
  relatedUuids: any[]
}

export default function UuidRelationView({ relatedUuids }: UuidRelationViewProps) {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')

  if (!relatedUuids || relatedUuids.length === 0) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Related UUIDs</h2>
          <p>No related UUIDs found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Related UUIDs</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>UUID</th>
              </tr>
            </thead>
            <tbody>
              {relatedUuids.map((related, index) => (
                <tr key={index}>
                  <td>{related._index?.replace('uuid_', '')}</td>
                  <td>{related.name}</td>
                  <td>
                    <Link
                      href={{
                        pathname: `/uuid/content/${related.uuid}`,
                        query: { pcip, cluster }
                      }}
                      className="link link-primary"
                    >
                      {related.uuid}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

### Phase 2: バックエンドAPI実装

#### 2.1 既存ファイルの拡張

**`backend/fastapi_app/app_fastapi.py`に追加**
```python
from fastapi import APIRouter
from core.broker_uuid import UuidBroker

# UUID関連のルーターを追加
uuid_router = APIRouter(prefix="/api/uuid", tags=["uuid"])
uuid_broker = UuidBroker()

@uuid_router.get("/list")
async def get_uuid_list(cluster: str):
    """UUID一覧取得"""
    try:
        uuids = await uuid_broker.get_all_uuids(cluster)
        return {"status": "success", "uuids": uuids}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@uuid_router.get("/search")
async def search_uuids(cluster: str, keyword: str):
    """UUID検索"""
    try:
        uuids = await uuid_broker.search_uuids(cluster, keyword)
        return {"status": "success", "uuids": uuids}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@uuid_router.get("/detail")
async def get_uuid_detail(cluster: str, uuid: str):
    """UUID詳細取得"""
    try:
        detail = await uuid_broker.get_uuid_detail(cluster, uuid)
        return {"status": "success", "detail": detail}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@uuid_router.get("/related")
async def get_related_uuids(cluster: str, uuid: str):
    """関連UUID取得"""
    try:
        related = await uuid_broker.get_related_uuids(cluster, uuid)
        return {"status": "success", "related": related}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# メインアプリにルーターを追加
app.include_router(uuid_router)
```

#### 2.2 新規ファイル作成

**`backend/core/broker_uuid.py`**
```python
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from core.ela import ElasticGateway

class UuidBroker:
    def __init__(self):
        self.elastic_gateway = ElasticGateway()
    
    async def get_all_uuids(self, cluster_name: str) -> List[Dict[str, Any]]:
        """指定クラスタの全UUIDを取得"""
        try:
            # 最新のタイムスタンプを取得
            latest_timestamp = await self._get_latest_timestamp(cluster_name)
            if not latest_timestamp:
                return []
            
            # 全UUIDを取得
            documents = self.elastic_gateway.get_uuidall_document(latest_timestamp, cluster_name)
            
            # フロントエンド用に整形
            uuids = []
            for doc in documents:
                source = doc.get('_source', {})
                uuids.append({
                    'uuid': source.get('uuid', ''),
                    'name': source.get('name', ''),
                    'type': doc.get('_index', '').replace('uuid_', ''),
                    'cluster_name': source.get('cluster_name', ''),
                    'timestamp': source.get('timestamp', ''),
                    '_index': doc.get('_index', ''),
                    '_id': doc.get('_id', '')
                })
            
            return uuids
        except Exception as e:
            print(f"Error getting all UUIDs: {e}")
            return []
    
    async def search_uuids(self, cluster_name: str, keyword: str) -> List[Dict[str, Any]]:
        """UUID検索"""
        try:
            # 最新のタイムスタンプを取得
            latest_timestamp = await self._get_latest_timestamp(cluster_name)
            if not latest_timestamp:
                return []
            
            # 検索実行
            alias = "search_uuid"
            documents = self.elastic_gateway.search_uuid_document(
                alias, latest_timestamp, cluster_name, keyword
            )
            
            # フロントエンド用に整形
            uuids = []
            for doc in documents:
                source = doc.get('_source', {})
                uuids.append({
                    'uuid': source.get('uuid', ''),
                    'name': source.get('name', ''),
                    'type': doc.get('_index', '').replace('uuid_', ''),
                    'cluster_name': source.get('cluster_name', ''),
                    'timestamp': source.get('timestamp', ''),
                    '_index': doc.get('_index', ''),
                    '_id': doc.get('_id', '')
                })
            
            return uuids
        except Exception as e:
            print(f"Error searching UUIDs: {e}")
            return []
    
    async def get_uuid_detail(self, cluster_name: str, uuid: str) -> Optional[Dict[str, Any]]:
        """UUID詳細取得"""
        try:
            # 最新のタイムスタンプを取得
            latest_timestamp = await self._get_latest_timestamp(cluster_name)
            if not latest_timestamp:
                return None
            
            # 指定UUIDの詳細を取得
            alias = "search_uuid"
            documents = self.elastic_gateway.search_uuid_document(
                alias, latest_timestamp, cluster_name, uuid
            )
            
            if documents:
                doc = documents[0]  # 最初のマッチを返す
                source = doc.get('_source', {})
                return {
                    'uuid': source.get('uuid', ''),
                    'name': source.get('name', ''),
                    'type': doc.get('_index', '').replace('uuid_', ''),
                    'cluster_name': source.get('cluster_name', ''),
                    'timestamp': source.get('timestamp', ''),
                    '_index': doc.get('_index', ''),
                    '_id': doc.get('_id', ''),
                    'raw_data': source
                }
            
            return None
        except Exception as e:
            print(f"Error getting UUID detail: {e}")
            return None
    
    async def get_related_uuids(self, cluster_name: str, uuid: str) -> List[Dict[str, Any]]:
        """関連UUID取得"""
        try:
            # 最新のタイムスタンプを取得
            latest_timestamp = await self._get_latest_timestamp(cluster_name)
            if not latest_timestamp:
                return []
            
            # 関連UUIDを検索（過去実装のロジックを参考）
            related_keywords = await self._generate_related_keywords(uuid)
            
            alias = "search_uuid"
            all_related = []
            
            for keyword in related_keywords:
                documents = self.elastic_gateway.search_uuid_document(
                    alias, latest_timestamp, cluster_name, keyword
                )
                all_related.extend(documents)
            
            # 重複除去とフロントエンド用整形
            seen_uuids = set()
            related_uuids = []
            
            for doc in all_related:
                source = doc.get('_source', {})
                doc_uuid = source.get('uuid', '')
                
                if doc_uuid != uuid and doc_uuid not in seen_uuids:
                    seen_uuids.add(doc_uuid)
                    related_uuids.append({
                        'uuid': doc_uuid,
                        'name': source.get('name', ''),
                        'type': doc.get('_index', '').replace('uuid_', ''),
                        'cluster_name': source.get('cluster_name', ''),
                        'timestamp': source.get('timestamp', ''),
                        '_index': doc.get('_index', ''),
                        '_id': doc.get('_id', '')
                    })
            
            return related_uuids
        except Exception as e:
            print(f"Error getting related UUIDs: {e}")
            return []
    
    async def _get_latest_timestamp(self, cluster_name: str) -> Optional[str]:
        """指定クラスタの最新タイムスタンプを取得"""
        try:
            # Elasticsearchから最新のタイムスタンプを取得
            es = self.elastic_gateway.es
            query = {
                "query": {
                    "bool": {
                        "must": [
                            {"match": {"cluster_name": cluster_name}}
                        ]
                    }
                },
                "sort": [{"timestamp": {"order": "desc"}}],
                "size": 1
            }
            
            result = es.search(index="search_uuid", body=query)
            hits = result.get('hits', {}).get('hits', [])
            
            if hits:
                return hits[0]['_source'].get('timestamp')
            
            return None
        except Exception as e:
            print(f"Error getting latest timestamp: {e}")
            return None
    
    async def _generate_related_keywords(self, uuid: str) -> List[str]:
        """関連UUID検索用のキーワードを生成"""
        # 過去実装のロジックを参考に、UUIDから関連キーワードを生成
        # 実際の実装では、UUIDの前後の部分や関連するパターンを抽出
        return [uuid[:8], uuid[-8:], uuid]
```

### Phase 3: 統合・テスト

#### 3.1 既存コンポーネントの調整

**`components/uuidlisttable.tsx`の調整**
- 既存の実装をそのまま使用
- 新しいデータ構造に対応

**`components/uuidhistory.tsx`の調整**
- 既存の実装をそのまま使用
- 新しいURL構造に対応

#### 3.2 ルーティング設定

**`app/uuid/page.tsx`でルーティング確認**
- `/uuid` → UUID一覧ページ
- `/uuid/content/[uuid]` → UUID詳細ページ

#### 3.3 テスト項目

1. **フロントエンドテスト**
   - UUID一覧表示
   - UUID検索機能
   - UUID詳細表示
   - 関連UUID表示
   - 履歴機能

2. **バックエンドテスト**
   - API エンドポイント動作確認
   - Elasticsearch連携確認
   - エラーハンドリング確認

3. **統合テスト**
   - フロントエンド・バックエンド連携
   - データフロー確認
   - パフォーマンス確認

## 実装スケジュール

### Week 1: フロントエンド基盤
- [ ] ディレクトリ構造作成
- [ ] 基本ページ実装
- [ ] コンポーネント実装
- [ ] カスタムフック実装

### Week 2: バックエンドAPI
- [ ] broker_uuid.py実装
- [ ] FastAPIルーター追加
- [ ] Elasticsearch連携確認
- [ ] エラーハンドリング実装

### Week 3: 統合・テスト
- [ ] フロントエンド・バックエンド統合
- [ ] 機能テスト
- [ ] パフォーマンステスト
- [ ] バグ修正

### Week 4: 最適化・完了
- [ ] UI/UX改善
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備
- [ ] 本番デプロイ準備

## 注意事項

1. **既存機能との整合性**
   - 既存のコンポーネント（uuidhistory.tsx, uuidlisttable.tsx）を活用
   - 既存のElasticsearch機能（ela.py）を活用

2. **パフォーマンス考慮**
   - 大量データの効率的な表示
   - 検索結果のページネーション
   - キャッシュ機能の実装

3. **エラーハンドリング**
   - API エラー時の適切な表示
   - ネットワークエラー対応
   - データ不整合時の対応

4. **セキュリティ**
   - 入力値のサニタイズ
   - API アクセス制御
   - 機密情報の適切な処理

---

**作成日**: 2024年1月  
**バージョン**: v1.0.0  
**ステータス**: 実装準備完了
