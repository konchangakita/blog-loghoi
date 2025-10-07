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



