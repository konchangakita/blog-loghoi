"""
接続管理システム
SocketIO接続とSSH接続のライフサイクルを統合管理
"""
import asyncio
import time
import sys
import os
from typing import Dict, Optional, Set

# パスを追加してcoreモジュールをインポート
sys.path.append(os.path.join(os.path.dirname(__file__), '../core'))
from common import connect_ssh


class ConnectionManager:
    """接続の統合管理を行うクラス"""
    
    def __init__(self):
        # 接続管理用の辞書
        self.socket_connections: Dict[str, dict] = {}  # sid -> connection_info
        self.ssh_connections: Dict[str, any] = {}      # sid -> ssh_connection
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}  # sid -> monitoring_task
        
    async def add_socket_connection(self, sid: str) -> None:
        """SocketIO接続を追加"""
        self.socket_connections[sid] = {
            'connected_at': time.time(),
            'is_active': True
        }
        print(f"SocketIO接続を追加: {sid}")
    
    async def remove_socket_connection(self, sid: str) -> None:
        """SocketIO接続を削除し、関連するSSH接続も即座に切断"""
        print(f"🔌 SocketIO接続を削除開始: {sid}")
        
        # 関連するSSH接続を即座に切断
        print(f"🔌 SSH接続のクリーンアップ開始: {sid}")
        await self._cleanup_ssh_connection(sid)
        print(f"🔌 SSH接続のクリーンアップ完了: {sid}")
        
        # 関連するログ監視タスクを即座に停止
        print(f"🔌 ログ監視タスクのクリーンアップ開始: {sid}")
        await self._cleanup_monitoring_task(sid)
        print(f"🔌 ログ監視タスクのクリーンアップ完了: {sid}")
        
        # SocketIO接続情報を削除
        if sid in self.socket_connections:
            del self.socket_connections[sid]
            print(f"🔌 SocketIO接続情報を削除: {sid}")
        
        print(f"🔌 SocketIO接続を削除完了: {sid}")
    
    async def add_ssh_connection(self, sid: str, cvm_ip: str) -> bool:
        """SSH接続を追加"""
        try:
            # 既存のSSH接続がある場合は先にクリーンアップ
            if sid in self.ssh_connections:
                await self._cleanup_ssh_connection(sid)
            
            print(f"SSH接続を開始: {cvm_ip} (SID: {sid})")
            ssh_connection = connect_ssh(cvm_ip)
            
            if not ssh_connection:
                print(f"SSH接続に失敗: {cvm_ip}")
                return False
            
            self.ssh_connections[sid] = ssh_connection
            print(f"SSH接続成功: {cvm_ip} (SID: {sid})")
            return True
            
        except Exception as e:
            print(f"SSH接続エラー: {e}")
            return False
    
    async def start_log_monitoring(self, sid: str, log_path: str, log_name: str, sio) -> bool:
        """ログ監視を開始"""
        if sid not in self.ssh_connections:
            print(f"SSH接続がありません: {sid}")
            return False
        
        if sid in self.monitoring_tasks:
            print(f"既にログ監視中です: {sid}")
            return False
        
        try:
            # 過去のログを取得
            await self._get_historical_logs(sid, log_path)
            
            # リアルタイム監視タスクを開始
            print(f"リアルタイム監視を開始: {log_path} (SID: {sid})")
            monitoring_task = asyncio.create_task(
                self._monitor_realtime_logs(sid, log_path, log_name, sio)
            )
            self.monitoring_tasks[sid] = monitoring_task
            
            return True
            
        except Exception as e:
            print(f"ログ監視開始エラー: {e}")
            return False
    
    async def stop_log_monitoring(self, sid: str) -> None:
        """ログ監視を停止"""
        await self._cleanup_monitoring_task(sid)

    async def stop_all(self, sid: str) -> None:
        """指定SIDの監視とSSH接続をすべて停止し、非アクティブ化する"""
        print(f"🔌 stop_all 開始: {sid}")
        await self._cleanup_monitoring_task(sid)
        await self._cleanup_ssh_connection(sid)
        if sid in self.socket_connections:
            self.socket_connections[sid]['is_active'] = False
        print(f"🔌 stop_all 完了: {sid}")
    
    async def _cleanup_ssh_connection(self, sid: str) -> None:
        """SSH接続をクリーンアップ"""
        if sid in self.ssh_connections:
            try:
                ssh_connection = self.ssh_connections[sid]
                print(f"SSH接続を切断開始: {sid}")
                ssh_connection.close()
                print(f"SSH connection close: {sid}")
            except Exception as e:
                print(f"SSH切断エラー: {e}")
            finally:
                del self.ssh_connections[sid]
                print(f"SSH接続情報を削除: {sid}")
    
    async def _cleanup_monitoring_task(self, sid: str) -> None:
        """ログ監視タスクをクリーンアップ"""
        if sid in self.monitoring_tasks:
            try:
                task = self.monitoring_tasks[sid]
                print(f"ログ監視タスクをキャンセル開始: {sid}")
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    print(f"ログ監視タスクをキャンセル完了: {sid}")
                except Exception as e:
                    print(f"ログ監視タスクキャンセルエラー: {e}")
            finally:
                del self.monitoring_tasks[sid]
                print(f"ログ監視タスクを停止完了: {sid}")
    
    async def _get_historical_logs(self, sid: str, log_path: str) -> None:
        """過去のログを取得"""
        if sid not in self.ssh_connections:
            return
        
        print(f"過去のログを取得中: {log_path} (SID: {sid})")
        
        try:
            # 過去ログ用の別SSH接続を使用
            from common import connect_ssh
            ssh_history = connect_ssh("10.38.113.32")  # 固定IPを使用
            if ssh_history:
                stdin, stdout, stderr = ssh_history.exec_command(f"tail -n 20 {log_path}")
                
                # 逐次行の出力は抑制（要点ログのみ残す）
                for line in stdout:
                    pass
                
                ssh_history.close()
                print(f"過去のログ取得完了: {sid}")
        except Exception as e:
            print(f"過去ログ取得エラー: {e}")
    
    async def _monitor_realtime_logs(self, sid: str, log_path: str, log_name: str, sio) -> None:
        """リアルタイムログ監視"""
        line_count = 0
        
        try:
            # 接続がアクティブかチェック
            if sid not in self.socket_connections or not self.socket_connections[sid]['is_active']:
                print(f"接続が非アクティブです: {sid}")
                return
            
            # リアルタイムログ用の新しいSSH接続を作成
            from common import connect_ssh
            cvm_ip = "10.38.113.32"  # 固定IPを使用
            print(f"リアルタイムログ用SSH接続を作成: {cvm_ip} (SID: {sid})")
            ssh_connection = connect_ssh(cvm_ip)
            
            if not ssh_connection:
                print(f"SSH接続に失敗: {cvm_ip}")
                return
            
            print(f"tail -fコマンドを実行: {log_path} (SID: {sid})")
            stdin, stdout, stderr = ssh_connection.exec_command(f"tail -f {log_path}")
            
            # ログを読み取り
            while sid in self.socket_connections and self.socket_connections[sid]['is_active']:
                try:
                    line = stdout.readline()
                    if not line:
                        break
                    
                    line_count += 1
                    # 各行の逐次出力は抑制（送信のみ）
                    
                    # SocketIOでログを送信
                    try:
                        await sio.emit('log', {
                            'name': log_name,
                            'line': line.strip(),
                            'line_number': line_count,
                            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                        })
                    except Exception as e:
                        print(f"SocketIOログ送信エラー: {e}")
                        break
                    
                    await asyncio.sleep(0.1)
                    
                except asyncio.CancelledError:
                    print(f"ログ監視タスクがキャンセルされました: {sid}")
                    raise
                except Exception as e:
                    print(f"ログ読み取りエラー: {e}")
                    break
            
            # 接続がアクティブでない場合は終了
            if sid not in self.socket_connections or not self.socket_connections[sid]['is_active']:
                print(f"接続が非アクティブになりました: {sid}")
                
        except asyncio.CancelledError:
            print(f"ログ監視タスクがキャンセルされました: {sid}")
            raise
        except Exception as e:
            print(f"ログ監視タスクで予期しないエラー: {e}")
        finally:
            # SSH接続をクリーンアップ
            try:
                if 'ssh_connection' in locals():
                    print(f"🔌 リアルタイムログ用SSH接続を切断: {sid}")
                    ssh_connection.close()
                    print(f"SSH connection close: {sid}")
            except Exception as e:
                print(f"🔌 SSH接続クリーンアップエラー: {e}")
            print(f"🔌 リアルタイムログ監視を終了: {sid}")
    
    def get_connection_status(self, sid: str) -> dict:
        """接続状態を取得"""
        return {
            'socket_connected': sid in self.socket_connections,
            'ssh_connected': sid in self.ssh_connections,
            'monitoring': sid in self.monitoring_tasks,
            'is_active': self.socket_connections.get(sid, {}).get('is_active', False) if sid in self.socket_connections else False
        }
    
    def get_all_connections(self) -> dict:
        """すべての接続状態を取得"""
        return {
            'socket_connections': len(self.socket_connections),
            'ssh_connections': len(self.ssh_connections),
            'monitoring_tasks': len(self.monitoring_tasks),
            'details': {sid: self.get_connection_status(sid) for sid in self.socket_connections.keys()}
        }


# グローバル接続管理インスタンス
connection_manager = ConnectionManager()












