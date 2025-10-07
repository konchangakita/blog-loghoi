import time
from typing import Any, Callable, Dict, Optional, Tuple


class SimpleTTLCache:
    """
    極めてシンプルなメモリ内TTLキャッシュ。
    - スレッド・プロセス間共有は考慮しない（単一Uvicornワーカー前提）
    - 小規模データの短期キャッシュ用途
    """

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}

    def _is_expired(self, expires_at: float) -> bool:
        return time.time() > expires_at

    def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if self._is_expired(expires_at):
            # 期限切れは削除してNone返却
            try:
                del self._store[key]
            except KeyError:
                pass
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        expires_at = time.time() + max(0, ttl_seconds)
        self._store[key] = (expires_at, value)

    def get_or_set(self, key: str, ttl_seconds: int, factory: Callable[[], Any]) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = factory()
        self.set(key, value, ttl_seconds)
        return value

    def clear(self, prefix: Optional[str] = None) -> None:
        if prefix is None:
            self._store.clear()
            return
        keys = [k for k in self._store.keys() if k.startswith(prefix)]
        for k in keys:
            try:
                del self._store[k]
            except KeyError:
                pass

    def clear_by_pattern(self, pattern: str) -> int:
        """
        正規表現パターンにマッチするキーのキャッシュをクリア
        戻り値: クリアしたキーの数
        """
        import re
        try:
            # パターンが^で始まらない場合は自動的に追加
            if not pattern.startswith('^'):
                pattern = '^' + pattern
            regex = re.compile(pattern)
            keys_to_clear = [k for k in self._store.keys() if regex.search(k)]
            for k in keys_to_clear:
                try:
                    del self._store[k]
                except KeyError:
                    pass
            return len(keys_to_clear)
        except re.error:
            # 正規表現エラーの場合は空文字列として扱う
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """キャッシュの統計情報を取得"""
        now = time.time()
        total_items = len(self._store)
        expired_items = sum(1 for _, (expires_at, _) in self._store.items() 
                          if self._is_expired(expires_at))
        
        return {
            "total_items": total_items,
            "expired_items": expired_items,
            "active_items": total_items - expired_items,
            "keys": list(self._store.keys())
        }

    def cleanup_expired(self) -> int:
        """期限切れのキャッシュを削除し、削除件数を返す"""
        removed = 0
        now = time.time()
        keys = list(self._store.keys())
        for key in keys:
            expires_at, _ = self._store.get(key, (0, None))
            if now > expires_at:
                try:
                    del self._store[key]
                    removed += 1
                except KeyError:
                    pass
        return removed



