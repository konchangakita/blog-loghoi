# 自動化スクリプトテスト

## 概要
このファイルは自動化スクリプトのテスト用です。

## テスト内容
- PR作成自動化スクリプト（`./scripts/create-pr.sh`）
- テスト実行自動化スクリプト（`./scripts/run-tests.sh`）

## 使用方法

### PR作成スクリプトのテスト
```bash
./scripts/create-pr.sh -t 999 -n test-automation
```

### テスト実行スクリプトのテスト
```bash
./scripts/run-tests.sh -h
```

## 期待される結果
- スクリプトが正常に動作する
- 適切なエラーメッセージが表示される
- GitHub CLIとの連携が正常に動作する

---
作成日: 2024-10-08
目的: 自動化スクリプトの動作確認
