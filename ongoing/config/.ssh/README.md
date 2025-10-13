# SSH Keys Directory

このディレクトリにはLogHoiがNutanix CVMに接続するためのSSH鍵が保存されます。

## ファイル
- `loghoi-key`: SSH秘密鍵（自動生成、Gitには含めない）
- `loghoi-key.pub`: SSH公開鍵（自動生成、Gitには含めない）

## 重要な仕様
- **鍵のタイプ**: RSA 3072bit
- **理由**: Nutanix Cluster Lockdownは4096bit RSA鍵をサポートしていないため、3072bitを使用

## 鍵の生成方法

### Kubernetes環境
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./deploy.sh
```

### docker-compose環境
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing
./scripts/init-ssh-keys.sh
```

## Nutanix Prismへの登録

1. 公開鍵を確認:
   ```bash
   cat loghoi-key.pub
   ```

2. Prism Element > Settings > Cluster Lockdown

3. 「Add Public Key」で公開鍵を登録

## トラブルシューティング

### SSH接続エラーが発生した場合
- 公開鍵がNutanix Prismに登録されているか確認
- UIの「Open SSH KEY」ボタンで公開鍵を確認・コピー

### 鍵を再生成したい場合
```bash
rm -f loghoi-key*
# 再度デプロイスクリプトを実行
```

## セキュリティ
- 秘密鍵のパーミッション: `600` (所有者のみ読み書き)
- 公開鍵のパーミッション: `644` (全員読み取り可)
- このディレクトリのパーミッション: `700` (所有者のみアクセス)
- **重要**: 秘密鍵は絶対にGitにコミットしないこと

