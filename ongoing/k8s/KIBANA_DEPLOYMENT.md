# Kibana デプロイメント手順

## 概要
このドキュメントは、KubernetesクラスターへのKibanaデプロイメント手順と設定内容を記載しています。

## 前提条件
- Elasticsearch 8.11.0 が正常に稼働していること
- Kubernetes クラスターへのアクセス権限があること
- kubectl コマンドが使用可能であること

## デプロイ構成

### Kibana
- **バージョン**: 8.11.0
- **レプリカ数**: 1
- **ポート**: 5601
- **リソース**:
  - Requests: 512Mi memory, 250m CPU
  - Limits: 1Gi memory, 500m CPU

### 環境変数
```yaml
- ELASTICSEARCH_HOSTS: http://elasticsearch-service:9200
- SERVER_NAME: kibana
- SERVER_HOST: 0.0.0.0
- XPACK_SECURITY_ENABLED: false
```

## デプロイ手順

### 1. Kibanaデプロイメントの作成
```bash
kubectl apply -f kibana-deployment.yaml -n loghoi
```

### 2. Kibanaサービスの作成
```bash
kubectl apply -f services.yaml -n loghoi
```

### 3. Ingressの更新
```bash
kubectl apply -f ingress.yaml -n loghoi
```

## アクセス方法

### Ingress経由（外部アクセス）
```
http://10.55.23.41/kibana
```

### クラスター内からのアクセス
```
http://kibana-service:5601
```

## 動作確認

### 1. Podの状態確認
```bash
kubectl get pods -n loghoi -l component=kibana
```

期待される出力：
```
NAME                      READY   STATUS    RESTARTS   AGE
kibana-xxxx-xxxx          1/1     Running   0          Xm
```

### 2. サービスの確認
```bash
kubectl get svc kibana-service -n loghoi
```

期待される出力：
```
NAME             TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
kibana-service   ClusterIP   10.103.236.239   <none>        5601/TCP   Xm
```

### 3. ログの確認
```bash
kubectl logs -n loghoi -l component=kibana --tail=50
```

正常な起動時には以下のようなメッセージが表示されます：
```
[INFO ][status] Kibana is now available
```

### 4. Elasticsearchとの接続確認
Pod内から確認：
```bash
kubectl exec -it <kibana-pod-name> -n loghoi -- curl -s http://elasticsearch-service:9200
```

## トラブルシューティング

### Kibanaが起動しない場合

1. **Elasticsearchの状態確認**
```bash
kubectl get pods -n loghoi -l app=elasticsearch
kubectl logs -n loghoi -l app=elasticsearch
```

2. **Kibanaのログ確認**
```bash
kubectl logs -n loghoi -l component=kibana --tail=100
```

3. **環境変数の確認**
```bash
kubectl describe pod -n loghoi -l component=kibana
```

### よくある問題

#### 問題: Kibanaが "Kibana server is not ready yet" と表示される
**原因**: Elasticsearchへの接続に失敗している可能性があります。
**解決方法**:
1. Elasticsearchが正常に動作しているか確認
2. ELASTICSEARCH_HOSTS 環境変数が正しいか確認
3. ネットワークポリシーやサービスの設定を確認

#### 問題: Podが CrashLoopBackOff になる
**原因**: メモリ不足またはElasticsearchとのバージョン不整合
**解決方法**:
1. リソースリミットを確認・調整
2. Kibanaのバージョンを確認（Elasticsearchと同じメジャーバージョンである必要がある）

## メンテナンス

### バージョンアップ
```bash
# イメージバージョンを変更
kubectl set image deployment/kibana kibana=docker.elastic.co/kibana/kibana:8.12.0 -n loghoi

# または、マニフェストファイルを編集してapply
kubectl apply -f kibana-deployment.yaml -n loghoi
```

### ログの確認
```bash
# リアルタイムでログを確認
kubectl logs -f -n loghoi -l component=kibana

# 最新100行のログを表示
kubectl logs -n loghoi -l component=kibana --tail=100
```

### 再起動
```bash
# Podを削除して再作成
kubectl delete pod -n loghoi -l component=kibana

# またはデプロイメントのロールアウト再起動
kubectl rollout restart deployment/kibana -n loghoi
```

## セキュリティに関する注意事項

現在の設定では、セキュリティ機能（認証・認可）は無効化されています（`XPACK_SECURITY_ENABLED: false`）。
本番環境では以下の対応を推奨します：

1. **セキュリティ機能の有効化**
   - Elasticsearch と Kibana の両方でセキュリティを有効化
   - TLS/SSL証明書の設定
   - ユーザー認証の設定

2. **ネットワークポリシーの適用**
   - 必要な通信のみを許可

3. **Ingressの認証設定**
   - Basic認証またはOAuth2の設定

## 関連ドキュメント
- [Elasticsearch デプロイメント](./elasticsearch-deployment.yaml)
- [Services 定義](./services.yaml)
- [Ingress 定義](./ingress.yaml)
- [Kubernetes 仕様書](./KUBERNETES_SPEC.md)


