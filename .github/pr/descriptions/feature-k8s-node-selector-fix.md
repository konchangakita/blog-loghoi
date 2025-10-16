## 目的
HostPath(手動PV)環境で control-plane 固定により Pod が Pending となる問題の恒久対応。

## 変更点
- deploy.sh: nodeSelector 自動設定をワーカーノード優先に変更
- ワーカー未検出時は先頭ノードにフォールバック

## 影響範囲
- Kubernetes デプロイのみ（Docker-compose に影響なし）

## 動作確認
1. 既存リソース削除（Deploy/Service/Ingress/ConfigMap/PVC/PV）
2. 修正済み deploy.sh で再デプロイ
3. Pending 解消を確認（backend/frontend/syslog Running, ES/Kibana 起動進行）
4. Syslog LB は従来どおり EXTERNAL-IP を取得（10.54.81.59）

## マージ方法
- Squash and merge を推奨

