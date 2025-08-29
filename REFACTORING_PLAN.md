# blog-loghoi リファクタリング計画

## 🎯 目的

- コード重複を 85%から 5%以下に削減
- 保守性を大幅に向上
- ブログシリーズとの連動性を維持

## 📁 新しいディレクトリ構造

```
blog-loghoi/
├── shared/                    # 共通ライブラリ
│   ├── backend/
│   │   ├── gateways/         # Gateway クラス群
│   │   │   ├── __init__.py
│   │   │   ├── regist.py     # RegistGateway
│   │   │   ├── realtime.py   # RealtimeLogGateway
│   │   │   ├── syslog.py     # SyslogGateway
│   │   │   ├── collect.py    # CollectLogGateway
│   │   │   └── elastic.py    # ElasticGateway
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   └── common.py     # 共通ユーティリティ
│   │   └── config/
│   │       ├── __init__.py
│   │       └── settings.py   # 設定管理
│   ├── frontend/
│   │   ├── components/       # 共通Reactコンポーネント
│   │   ├── api/             # API接続ロジック
│   │   └── types/           # TypeScript型定義
│   └── docker/
│       ├── base-compose.yml # ベースDocker構成
│       └── templates/       # Dockerfileテンプレート
├── versions/                 # バージョン固有実装
│   ├── v0814/               # 旧blog/0814
│   ├── v0821/               # 旧blog/0821
│   ├── v1023/               # 旧blog/1023
│   ├── v1202/               # 旧blog/1202
│   ├── v20240513/           # 旧blog/20240513
│   └── v20240520/           # 旧blog/20240520
├── ongoing/                 # 現在の開発バージョン
└── README.md
```

## 🔧 実装戦略

### Phase 1: 共通ライブラリ構築

1. `shared/backend/gateways/` に Gateway クラス群を移動
2. `shared/backend/utils/common.py` に共通ユーティリティを統合
3. `shared/backend/config/settings.py` で設定管理を統一

### Phase 2: バージョン固有実装

1. 各バージョンは `shared` をインポート
2. バージョン固有の差分のみを保持
3. `app.py` は薄いラッパーとして実装

### Phase 3: フロントエンド統合

1. 共通コンポーネントの抽出
2. バージョン固有 UI の分離
3. 設定ベースの機能切り替え

## 🎯 期待効果

- **コード削減**: 5,513 行 → 約 1,500 行（73%削減）
- **保守性向上**: 1 回の修正で全バージョンに反映
- **開発効率**: 新機能追加時の作業量大幅削減
- **品質向上**: 一元化によるバグ修正の確実性

## 📋 実行計画

1. ✅ 現状分析完了
2. 🔄 共通ライブラリ設計（進行中）
3. ⏳ shared/ ディレクトリ構築
4. ⏳ ongoing/ の共通ライブラリ統合
5. ⏳ 各バージョンの段階的統合
6. ⏳ 動作確認とテスト
