"""
SSH接続管理クラス
Tidy First原則に従って、SSH接続の責任を分離
"""
import asyncio
import time
from typing import Optional
from core.common import connect_ssh


class SSHConnectionManager:
    """SSH接続の管理を行うクラス"""
    
    def __init__(self):
        self.connection: Optional[any] = None
        self.is_connected: bool = False
    
    def connect(self, cvm_ip: str) -> bool:
        """SSH接続を確立"""
        try:
            # 既存の接続がある場合はクリーンアップ
            if self.connection:
                print("既存のSSH接続をクリーンアップします")
                self.disconnect()
            
            print(f"SSH接続を開始: {cvm_ip}")
            self.connection = connect_ssh(cvm_ip)
            
            if not self.connection:
                print(f"SSH接続に失敗しました: {cvm_ip}")
                self.is_connected = False
                return False
            
            print(f"SSH接続成功: {cvm_ip}")
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"SSH接続エラー: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self) -> None:
        """SSH接続を切断"""
        if self.connection:
            try:
                self.connection.close()
                print("SSH接続を切断しました")
            except Exception as e:
                print(f"SSH切断エラー: {e}")
            finally:
                self.connection = None
                self.is_connected = False
    
    def get_connection(self) -> Optional[any]:
        """SSH接続オブジェクトを取得"""
        return self.connection
    
    def is_connection_active(self) -> bool:
        """接続状態を確認"""
        return self.is_connected and self.connection is not None


class LogMonitor:
    """ログ監視の管理を行うクラス"""
    
    def __init__(self, ssh_manager: SSHConnectionManager):
        self.ssh_manager = ssh_manager
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_monitoring: bool = False
        self.line_count: int = 0
        self.reconnect_count: int = 0
        self.max_reconnects: int = 5
    
    async def start_monitoring(self, log_path: str, log_name: str, sio) -> bool:
        """ログ監視を開始"""
        if self.is_monitoring:
            print("既にログ監視中です")
            return False
        
        if not self.ssh_manager.is_connection_active():
            print("SSH接続がありません")
            return False
        
        try:
            # 過去のログを取得
            await self._get_historical_logs(log_path)
            
            # リアルタイム監視を開始
            print(f"リアルタイム監視を開始: {log_path} (ログ名: {log_name})")
            self.monitoring_task = asyncio.create_task(
                self._monitor_realtime_logs(log_path, log_name, sio)
            )
            self.is_monitoring = True
            return True
            
        except Exception as e:
            print(f"ログ監視開始エラー: {e}")
            return False
    
    async def stop_monitoring(self) -> None:
        """ログ監視を停止"""
        if self.monitoring_task:
            print("ログ監視タスクを停止します")
            self.monitoring_task.cancel()
            self.monitoring_task = None
        
        self.is_monitoring = False
        self.line_count = 0
        self.reconnect_count = 0
    
    async def _get_historical_logs(self, log_path: str) -> None:
        """過去のログを取得"""
        print(f"過去のログを取得中: {log_path}")
        
        # 過去ログ用の別SSH接続を使用
        ssh_history = connect_ssh("10.38.112.31")  # 固定IPを使用
        if ssh_history:
            try:
                stdin_history, stdout_history, stderr_history = ssh_history.exec_command(
                    f"tail -n 20 {log_path}"
                )
                
                # 過去のログを読み取り
                for line in stdout_history:
                    if line.strip():
                        print(f"過去ログ: {line.strip()}")
                
                print("過去のログ取得完了")
            finally:
                ssh_history.close()
    
    async def _monitor_realtime_logs(self, log_path: str, log_name: str, sio) -> None:
        """リアルタイムログ監視（再接続機能付き）"""
        try:
            while self.reconnect_count < self.max_reconnects:
                try:
                    await self._read_log_lines(log_path, log_name, sio)
                    break  # 正常終了の場合はループを抜ける
                    
                except Exception as e:
                    print(f"リアルタイムログ監視エラー: {e}")
                    await self._handle_reconnection(log_path)
        
        except asyncio.CancelledError:
            print("ログ監視タスクがキャンセルされました")
            raise
        except Exception as e:
            print(f"ログ監視タスクで予期しないエラー: {e}")
        finally:
            print("リアルタイムログ監視を終了しました")
    
    async def _read_log_lines(self, log_path: str, log_name: str, sio) -> None:
        """ログ行を読み取り"""
        ssh = self.ssh_manager.get_connection()
        if not ssh:
            raise Exception("SSH接続がありません")
        
        print(f"SSH接続でtail -fを実行: {log_path} (再接続回数: {self.reconnect_count})")
        stdin, stdout, stderr = ssh.exec_command(f"tail -f {log_path}")
        
        # リアルタイムログを読み取り
        while True:
            try:
                line = stdout.readline()
                if not line:
                    print(f"stdoutが終了しました (再接続回数: {self.reconnect_count})")
                    break
                
                self.line_count += 1
                print(f"リアルタイムログ [{self.line_count}]: {line.strip()}")
                
                # SocketIOでログを送信
                await self._emit_log_to_socketio(sio, log_name, line.strip())
                
                # 100行ごとに接続状態を確認
                if self.line_count % 100 == 0:
                    print(f"接続状態確認 - 処理済み行数: {self.line_count}")
                
                # 少し待機してから次の行を読み取り
                await asyncio.sleep(0.1)
                
            except asyncio.CancelledError:
                print("ログ監視タスクがキャンセルされました")
                raise
            except Exception as e:
                print(f"ログ読み取りエラー: {e}")
                break
    
    async def _emit_log_to_socketio(self, sio, log_name: str, line: str) -> None:
        """SocketIOでログを送信"""
        try:
            await sio.emit('log', {
                'name': log_name,
                'line': line,
                'line_number': self.line_count,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            })
        except Exception as e:
            print(f"SocketIOログ送信エラー: {e}")
    
    async def _handle_reconnection(self, log_path: str) -> None:
        """再接続処理"""
        self.reconnect_count += 1
        
        if self.reconnect_count < self.max_reconnects:
            print(f"SSH接続を再接続します ({self.reconnect_count}/{self.max_reconnects})")
            try:
                # SSH接続を閉じる
                self.ssh_manager.disconnect()
                
                # 新しいSSH接続を確立
                if self.ssh_manager.connect("10.38.112.31"):  # 固定IPを使用
                    print(f"SSH再接続成功 ({self.reconnect_count}/{self.max_reconnects})")
                    await asyncio.sleep(5)  # 5秒待機してから再試行
                else:
                    print(f"SSH再接続失敗 ({self.reconnect_count}/{self.max_reconnects})")
                    await asyncio.sleep(10)  # 10秒待機してから再試行
                    
            except Exception as reconnect_error:
                print(f"SSH再接続エラー: {reconnect_error}")
                await asyncio.sleep(10)
        else:
            print(f"最大再接続回数に達しました ({self.max_reconnects})")
    
    def get_status(self) -> dict:
        """監視状態を取得"""
        return {
            'is_monitoring': self.is_monitoring,
            'line_count': self.line_count,
            'reconnect_count': self.reconnect_count,
            'is_connected': self.ssh_manager.is_connection_active()
        }

