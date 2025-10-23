# LogHoi スタイルガイド

## 概要

このドキュメントは、LogHoiプロジェクトのフロントエンド開発における統一されたデザインシステムとコーディング規約を定義します。

## デザインシステム

### カラーパレット

#### プライマリカラー
- **Primary**: `#3b82f6` (blue-500) - メインアクション、リンク
- **Primary Dark**: `#1d4ed8` (blue-700) - ホバー状態
- **Primary Light**: `#dbeafe` (blue-100) - 背景色

#### セカンダリカラー
- **Success**: `#22c55e` (green-500) - 成功状態
- **Warning**: `#f59e0b` (amber-500) - 警告状態
- **Error**: `#ef4444` (red-500) - エラー状態
- **Info**: `#3b82f6` (blue-500) - 情報表示

#### ニュートラルカラー
- **Gray 50**: `#f9fafb` - 背景色
- **Gray 100**: `#f3f4f6` - 軽い背景色
- **Gray 500**: `#6b7280` - テキスト（セカンダリ）
- **Gray 900**: `#111827` - テキスト（プライマリ）

### タイポグラフィ

#### フォントファミリー
- **Primary**: `Inter, system-ui, sans-serif`
- **Monospace**: `JetBrains Mono, Consolas, monospace` (コード用)

#### フォントサイズ
- **xs**: `0.75rem` (12px) - 補助テキスト
- **sm**: `0.875rem` (14px) - 小さいテキスト
- **base**: `1rem` (16px) - 本文
- **lg**: `1.125rem` (18px) - サブタイトル
- **xl**: `1.25rem` (20px) - タイトル
- **2xl**: `1.5rem` (24px) - 大タイトル
- **3xl**: `1.875rem` (30px) - ヘッダー

#### フォントウェイト
- **Normal**: `400` - 本文
- **Medium**: `500` - 強調テキスト
- **Semibold**: `600` - サブタイトル
- **Bold**: `700` - タイトル

### スペーシング

#### パディング・マージン
- **xs**: `0.25rem` (4px)
- **sm**: `0.5rem` (8px)
- **md**: `1rem` (16px)
- **lg**: `1.5rem` (24px)
- **xl**: `2rem` (32px)
- **2xl**: `3rem` (48px)

#### コンポーネント間隔
- **Tight**: `0.5rem` (8px) - 関連要素間
- **Normal**: `1rem` (16px) - 標準的な間隔
- **Loose**: `2rem` (32px) - セクション間

### ボーダー・シャドウ

#### ボーダー
- **Radius**: `0.375rem` (6px) - 標準的な角丸
- **Width**: `1px` - 標準的なボーダー幅
- **Color**: `#e5e7eb` (gray-200) - 標準的なボーダー色

#### シャドウ
- **Small**: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **Medium**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **Large**: `0 10px 15px -3px rgb(0 0 0 / 0.1)`

## コンポーネント規約

### ボタン

#### バリエーション
- **Primary**: メインアクション用
- **Secondary**: セカンダリアクション用
- **Success**: 成功アクション用
- **Error**: 危険なアクション用
- **Warning**: 警告アクション用
- **Ghost**: 控えめなアクション用
- **Outline**: 境界線のみのアクション用

#### サイズ
- **xs**: 小さなボタン（アイコンボタン等）
- **sm**: 小さいボタン
- **md**: 標準サイズ
- **lg**: 大きなボタン

#### 使用例
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  保存
</Button>

<IconButton 
  icon={faDownload} 
  variant="ghost" 
  size="sm"
  onClick={handleDownload}
  aria-label="ダウンロード"
/>
```

### 入力フィールド

#### バリエーション
- **Bordered**: 標準的な境界線付き
- **Ghost**: 境界線なし
- **Primary**: プライマリカラーの境界線

#### サイズ
- **xs**: 小さな入力フィールド
- **sm**: 小さい入力フィールド
- **md**: 標準サイズ
- **lg**: 大きな入力フィールド

#### 使用例
```tsx
<Input
  type="text"
  placeholder="検索キーワード"
  value={searchTerm}
  onChange={handleSearchChange}
  icon={faSearch}
  size="md"
/>

<SearchInput
  placeholder="UUID検索"
  value={searchValue}
  onChange={handleSearchChange}
  onSearch={handleSearch}
  showClearButton={true}
/>
```

### カード

#### バリエーション
- **Default**: 標準的なカード
- **Bordered**: 境界線付きカード
- **Compact**: コンパクトなカード
- **Side**: 横並びレイアウト
- **Elevated**: 影付きカード

#### 使用例
```tsx
<Card variant="bordered" className="p-4">
  <CardHeader>
    <CardTitle>UUID情報</CardTitle>
  </CardHeader>
  <CardBody>
    <p>UUIDの詳細情報がここに表示されます。</p>
  </CardBody>
  <CardActions justify="end">
    <Button variant="primary">詳細</Button>
  </CardActions>
</Card>
```

### モーダル

#### サイズ
- **xs**: 小さなモーダル
- **sm**: 小さいモーダル
- **md**: 標準サイズ
- **lg**: 大きなモーダル
- **xl**: 特大モーダル

#### 使用例
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={handleClose}
  title="確認"
  size="md"
>
  <p>この操作を実行しますか？</p>
  <div className="modal-action">
    <Button variant="ghost" onClick={handleClose}>キャンセル</Button>
    <Button variant="primary" onClick={handleConfirm}>確認</Button>
  </div>
</Modal>
```

### ローディング

#### バリエーション
- **Spinner**: 回転するスピナー
- **Dots**: 点々のアニメーション
- **Bug**: 虫アイコンの回転（LogHoi独自）
- **Pulse**: パルスアニメーション

#### 使用例
```tsx
<Loading 
  variant="bug" 
  text="UUID collecting..." 
  size="md" 
/>

<InlineLoading 
  text="データを読み込み中..." 
  size="sm" 
/>
```

## レイアウト規約

### グリッドシステム
- **Container**: `max-w-7xl mx-auto px-4`
- **Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Flex**: `flex flex-col md:flex-row gap-4`

### レスポンシブデザイン
- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### ブレークポイント
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## アクセシビリティ

### カラーコントラスト
- **AA準拠**: 4.5:1 以上のコントラスト比
- **AAA準拠**: 7:1 以上のコントラスト比（推奨）

### キーボードナビゲーション
- **Tab順序**: 論理的な順序で配置
- **フォーカス表示**: 明確なフォーカスインジケーター
- **キーボードショートカット**: 主要機能にキーボードショートカットを提供

### スクリーンリーダー
- **aria-label**: アイコンボタンに適切なラベル
- **role属性**: セマンティックな役割を明示
- **alt属性**: 画像に適切な代替テキスト

## パフォーマンス

### 画像最適化
- **WebP形式**: 対応ブラウザではWebPを使用
- **遅延読み込み**: `loading="lazy"`属性を使用
- **適切なサイズ**: 表示サイズに合わせた画像サイズ

### バンドルサイズ
- **Tree Shaking**: 未使用のコードを削除
- **Code Splitting**: ページ単位での分割
- **動的インポート**: 必要時のみ読み込み

## コーディング規約

### TypeScript
- **型定義**: すべてのpropsに型を定義
- **インターフェース**: コンポーネントのpropsはinterfaceで定義
- **ジェネリクス**: 再利用可能なコンポーネントでジェネリクスを活用

### React
- **関数コンポーネント**: クラスコンポーネントではなく関数コンポーネントを使用
- **Hooks**: 状態管理にはHooksを使用
- **メモ化**: 必要に応じて`React.memo`を使用

### CSS
- **Tailwind CSS**: ユーティリティファーストのアプローチ
- **カスタムCSS**: 最小限に抑制
- **CSS Modules**: 必要に応じてCSS Modulesを使用

## テスト

### 単体テスト
- **コンポーネントテスト**: 各コンポーネントの動作をテスト
- **スナップショットテスト**: UIの変更を検出
- **アクセシビリティテスト**: アクセシビリティ要件をテスト

### 統合テスト
- **ユーザーフロー**: 主要なユーザーフローをテスト
- **API統合**: バックエンドとの統合をテスト

## ドキュメント

### コンポーネントドキュメント
- **Props**: すべてのpropsの説明
- **使用例**: 実際の使用例を提供
- **ストーリー**: Storybookでのストーリー作成

### コメント規約
```tsx
/**
 * 共通ボタンコンポーネント
 * 
 * @param variant - ボタンのバリエーション
 * @param size - ボタンのサイズ
 * @param disabled - 無効化フラグ
 * @param loading - ローディング状態
 * @param onClick - クリックハンドラー
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // 実装
}
```

## 更新履歴

- **v1.0.0** (2025-01-04): 初版作成
- **v1.1.0** (2025-01-04): エラーハンドリング統一対応
- **v1.2.0** (2025-01-04): 共通コンポーネント追加
