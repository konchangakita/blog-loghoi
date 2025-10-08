from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import time
import requests
import paramiko
import re
from base64 import b64encode

from core.ela import ElasticGateway
from utils.common import change_timestamp
from utils.error_handler import (
    APIError, ValidationError, AuthenticationError, NotFoundError, 
    create_success_response, create_error_response, log_error,
    validate_required_fields, validate_http_status
)
from utils.cache import SimpleTTLCache
from utils.structured_logger import api_logger, EventType, log_execution_time

router = APIRouter(prefix="/api/uuid", tags=["uuid"])
cache = SimpleTTLCache()

# Pydantic models
class UuidConnectRequest(BaseModel):
    cluster_name: str
    prism_ip: str

class UuidQueryRequest(BaseModel):
    pcip: str
    cluster: str
    prism: Optional[str] = None

class UuidSearchRequest(UuidQueryRequest):
    search: str

class UuidContentRequest(UuidQueryRequest):
    content: str

# Initialize Elasticsearch gateway
es = ElasticGateway()

def format_rdata(data: Dict[str, Any], main_flag: bool = False) -> Dict[str, Any]:
    """Format raw data from Elasticsearch into structured format"""
    r_data = {}

    if 'uuid_vms' in data:
        vmlist = []
        for vm in data['uuid_vms']:
            _data = {
                'name': vm['name'],
                'uuid': vm['uuid'],
                'cluster_uuid': vm['cluster_uuid']
            }
            vmlist.append(_data)
        r_data['vmlist'] = vmlist

    if 'uuid_volume_groups' in data:
        vglist = []
        for vg in data['uuid_volume_groups']:
            _data = {
                'name': vg['name'],
                'uuid': vg['uuid'],
                'cluster_uuid': vg['cluster_uuid']
            }
            if main_flag == 'vglist':
                _data['disklist'] = vg.get('disk_list', [])
                if 'attachment_list' in vg:
                    _data['attachment_list'] = vg['attachment_list']
            vglist.append(_data)
        r_data['vglist'] = vglist

    if 'uuid_vfilers' in data:
        vflist = []
        for vf in data['uuid_vfilers']:
            _data = {
                'name': vf['name'],
                'uuid': vf['uuid'],
                'cluster_uuid': vf['cluster_uuid']
            }
            if main_flag == 'vflist':
                _data['nvms'] = vf.get('nvms', [])
            vflist.append(_data)
        r_data['vflist'] = vflist

    if 'uuid_shares' in data:
        sharelist = []
        for sh in data['uuid_shares']:
            _data = {
                'name': sh['name'],
                'uuid': sh['uuid'],
                'cluster_uuid': sh['cluster_uuid']
            }
            if main_flag == 'sharelist':
                _data['fileServerName'] = sh.get('fileServerName', '')
                _data['fileServerUuid'] = sh.get('fileServerUuid', '')
                _data['containerUuid'] = sh.get('containerUuid', '')
                _data['defaultQuotaPolicyUuid'] = sh.get('defaultQuotaPolicyUuid', '')
            sharelist.append(_data)
        r_data['sharelist'] = sharelist
    elif 'uuid_share_details' in data:
        sharelist = []
        for sh in data['uuid_share_details']:
            _data = {
                'name': sh['Share name'],
                'uuid': sh['Share UUID']
            }
            sharelist.append(_data)
        r_data['sharelist'] = sharelist

    if 'uuid_storage_containers' in data:
        sclist = []
        for sc in data['uuid_storage_containers']:
            _data = {
                'name': sc['name'],
                'uuid': sc['storage_container_uuid'],
                'cluster_uuid': sc['cluster_uuid']
            }
            if main_flag == 'sclist':
                _data['own_usage_bytes'] = sc.get('usage_stats', {}).get('storage.user_container_own_usage_bytes', 0)
                _data['compression_enabled'] = sc.get('compression_enabled', False)
                _data['on_disk_dedup'] = sc.get('on_disk_dedup', '')
                _data['erasure_code'] = sc.get('erasure_code', '')
                _data['enable_software_encryption'] = sc.get('enable_software_encryption', False)
            sclist.append(_data)
        r_data['sclist'] = sclist

    return r_data

def format_document(hits: list) -> Dict[str, Any]:
    """Format Elasticsearch hits into document structure"""
    doc = {}
    for hit in hits:
        index_name = hit['_index']
        if index_name not in doc:
            doc[index_name] = []
        doc[index_name].append(hit['_source'])
    return doc

class UuidAPI:
    """UUID API client for Nutanix Prism"""
    
    def get_cluster(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get cluster information"""
        request_url = f"https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/cluster/"
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
            if response.status_code == 401:
                print(f"Authentication failed for cluster {prism_ip}")
                raise HTTPException(status_code=401, detail="Authentication failed")
            elif response.status_code != 200:
                print(f"Cluster API error: {response.status_code}")
        except requests.exceptions.ConnectTimeout:
            print(f"Connection timeout to cluster {prism_ip}")
            raise HTTPException(status_code=408, detail="Connection timeout")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Cluster API exception: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        return response

    def get_vms(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get VMs information"""
        request_url = f'https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/vms/'
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
        return response

    def get_volume_groups(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get volume groups information"""
        request_url = f'https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/volume_groups/'
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
        return response

    def get_storage_containers(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get storage containers information"""
        request_url = f'https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/storage_containers/'
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
        return response

    def get_vfilers(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get vfilers information"""
        request_url = f'https://{prism_ip}:9440/PrismGateway/services/rest/v1/vfilers/'
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
        return response

    def get_shares(self, prism_ip: str, headers: Dict[str, str]) -> requests.Response:
        """Get shares information"""
        request_url = f'https://{prism_ip}:9440/PrismGateway/services/rest/v1/vfilers/shares/'
        try:
            response = requests.get(request_url, headers=headers, verify=False, timeout=30)
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
        return response

    def connection_headers(self, prism_ip: str) -> Dict[str, str]:
        """Create authentication headers using SSH key"""
        try:
            # SSH鍵を使用してSSH接続をテスト
            from core.common import connect_ssh
            ssh_client = connect_ssh(prism_ip)
            if not ssh_client:
                raise HTTPException(status_code=401, detail="SSH connection failed")
            
            # SSH接続が成功した場合、Basic認証のヘッダーを作成
            # SSH鍵認証が成功した場合、Basic認証を使用してPrism APIにアクセス
            # 実際の実装では、SSH鍵を使用してSSH接続を行い、
            # そこからAPI認証トークンを取得する必要があります
            # ここでは簡易的にSSH鍵の存在確認のみ行います
            
            # 実際のNutanixクラスターの認証情報を使用
            # SSH鍵認証が成功した場合、実際のadminパスワードを使用
            actual_password = "nx2Tech958!"
            encoded_credentials = b64encode(
                bytes(f"admin:{actual_password}", encoding="ascii")
            ).decode("ascii")
            auth_header = f"Basic {encoded_credentials}"
            
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"{auth_header}",
                "cache-control": "no-cache",
            }
            ssh_client.close()
            print(f"SSH key authentication successful for cluster: {prism_ip}")
            return headers
            
        except Exception as e:
            print(f"SSH key authentication failed: {e}")
            raise HTTPException(status_code=401, detail="SSH key authentication failed")

    async def get_xdata(self, prism_ip: str) -> Dict[str, Any]:
        """Get all UUID data from cluster (parallelized)"""
        import asyncio
        import aiohttp
        
        res = {}
        headers = self.connection_headers(prism_ip)
        
        # 並列でAPI呼び出しを実行
        async def fetch_data(session, url, name):
            try:
                async with session.get(url, headers=headers, ssl=False, timeout=30) as response:
                    return name, await response.json(), response.status
            except Exception as e:
                print(f"Error fetching {name}: {e}")
                return name, None, 500
        
        async def fetch_all_data():
            urls = {
                'cluster': f"https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/cluster/",
                'vms': f"https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/vms/",
                'storage_containers': f"https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/storage_containers/",
                'volume_groups': f"https://{prism_ip}:9440/PrismGateway/services/rest/v2.0/volume_groups/",
                'vfilers': f"https://{prism_ip}:9440/PrismGateway/services/rest/v1/vfilers/"
            }
            
            async with aiohttp.ClientSession() as session:
                tasks = [fetch_data(session, url, name) for name, url in urls.items()]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        continue
                    name, data, status = result
                    if data is not None:
                        # レスポンスオブジェクトの代わりに辞書を格納
                        res[name] = {'data': data, 'status_code': status}
                    else:
                        res[name] = {'data': None, 'status_code': status}
        
        # 非同期実行
        asyncio.run(fetch_all_data())
        
        # vfilersの結果に基づいてsharesを取得
        if res.get('vfilers', {}).get('status_code') == 200:
            vfiler_data = res['vfilers']['data']
            if vfiler_data and len(vfiler_data.get('entities', [])):
                # sharesを同期的に取得（依存関係のため）
                res['shares'] = self.get_shares(prism_ip, headers)
                if res['shares'].status_code == 200:
                    res['res_share_details'] = []
                else:
                    res['res_share_details'] = []
            else:
                res['shares'] = None
                res['res_share_details'] = []
        else:
            res['shares'] = None
            res['res_share_details'] = []
        
        return res

    async def connect_cluster(self, request: UuidConnectRequest) -> Dict[str, Any]:
        """Connect to cluster and store UUID data"""
        try:
            res = await self.get_xdata(request.prism_ip)
            
            # Check if cluster connection is successful
            cluster_data = res.get("cluster", {})
            if cluster_data.get("status_code") == 200:
                # Store data in Elasticsearch
                data = es.put_data_uuid(res)
                time.sleep(1)
                return {"status": "success", "data": data}
            else:
                cluster_json = cluster_data.get("data", {})
                if cluster_json and "message_list" in cluster_json:
                    error_msg = cluster_json["message_list"][0]["message"]
                    raise HTTPException(status_code=400, detail=error_msg)
                else:
                    raise HTTPException(status_code=500, detail="Cluster connection failed")
        except HTTPException:
            # HTTPExceptionはそのまま再発生
            raise
        except Exception as e:
            print(f"Error in connect_cluster: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def get_alllist(self, timestamp_utcstr: str, cluster_name: str) -> Dict[str, Any]:
        """Get all UUID data from Elasticsearch"""
        alllist = {}
        hits = es.get_uuidall_document(timestamp_utcstr, cluster_name)
        alllist = format_document(hits)
        return alllist

    def get_latestdataset(self, cluster_name: str) -> Dict[str, Any]:
        """Get latest UUID dataset"""
        timeslot = es.get_timeslot(cluster_name)
        if not timeslot:
            raise HTTPException(status_code=404, detail="No data found for cluster")
        
        timestamp_utcstr = timeslot[0]['utc_time']
        timestamp_list = change_timestamp(timestamp_utcstr)
        
        data = self.get_alllist(timestamp_utcstr, cluster_name)
        
        r_data = {
            'list': format_rdata(data),
            'cluster_name': cluster_name,
            'timeslot': timeslot,
            'timestamp_list': timestamp_list[0]
        }
        
        return r_data

    def get_contentdataset(self, cluster_name: str, key_uuid: str) -> Dict[str, Any]:
        """Get UUID content dataset with related data"""
        timeslot = es.get_timeslot(cluster_name)
        if not timeslot:
            raise HTTPException(status_code=404, detail="No data found for cluster")
        
        timestamp_utcstr = timeslot[0]['utc_time']
        timestamp_list = change_timestamp(timestamp_utcstr)
        
        alias = 'search_uuid'
        hits = es.search_uuid_document(alias, timestamp_utcstr, cluster_name, key_uuid)
        search_result = format_document(hits)
        
        # Find main flag and related data
        main_flag = ''
        _search_result = search_result.copy()
        
        for index in search_result:
            for entity in search_result[index]:
                if index == 'uuid_vms' and entity['uuid'] == key_uuid:
                    main_flag = 'vmlist'
                    break
                elif index == 'uuid_volume_groups' and entity['uuid'] == key_uuid:
                    main_flag = 'vglist'
                    # Add related storage containers, shares, VMs, vfilers
                    multi_query = []
                    if entity.get('disk_list'):
                        query = {"match_phrase": {"storage_container_uuid.keyword": entity['disk_list'][0]['container_uuid']}}
                        multi_query.append(query)
                    
                    if entity.get('name', '').startswith('NTNX') and entity['name'].count('-') >= 10:
                        _vgsetuuid = entity['name'].split('-', 2)[2]
                        vgsetuuid = _vgsetuuid.rsplit('-', 5)[0]
                        query = {"match_phrase": {"Volume group set UUID.keyword": vgsetuuid}}
                        multi_query.append(query)
                    
                    if 'attachment_list' in entity:
                        for uuid_list in entity['attachment_list']:
                            if 'vm_uuid' in uuid_list:
                                query = {"match_phrase": {"uuid.keyword": uuid_list['vm_uuid']}}
                                multi_query.append(query)
                            if 'iscsi_initiator_name' in uuid_list:
                                nvms_uuid = uuid_list['iscsi_initiator_name'].split(':')[1]
                                query = {"match_phrase": {"nvms.uuid.keyword": nvms_uuid}}
                                multi_query.append(query)
                    
                    if multi_query:
                        result = es.search_uuidadditional_document(alias, timestamp_utcstr, cluster_name, multi_query)
                        _result = format_document(result)
                        _search_result.update(_result)
                    break
                
                elif index == 'uuid_vfilers' and entity['uuid'] == key_uuid:
                    main_flag = 'vflist'
                    if entity.get('nvms'):
                        multi_query = []
                        for nvms in entity['nvms']:
                            query = {"match_phrase": {"uuid.keyword": nvms['vmUuid']}}
                            multi_query.append(query)
                            query = {"match_phrase": {"attachment_list.iscsi_initiator_name": nvms['uuid']}}
                            multi_query.append(query)
                        result = es.search_document_additional(alias, timestamp_utcstr, cluster_name, multi_query)
                        _result = format_document(result)
                        _search_result.update(_result)
                    break
                
                elif index == 'uuid_shares' and entity['uuid'] == key_uuid:
                    main_flag = 'sharelist'
                    multi_query = []
                    query = {"match_phrase": {"uuid.keyword": entity['fileServerUuid']}}
                    multi_query.append(query)
                    if search_result.get('uuid_share_details'):
                        query = {"match_phrase": {"name": search_result['uuid_share_details'][0]['Volume group set UUID']}}
                        multi_query.append(query)
                    result = es.search_document_additional(alias, timestamp_utcstr, cluster_name, multi_query)
                    _result = format_document(result)
                    _search_result.update(_result)
                    break
                
                elif index == 'uuid_storage_containers':
                    main_flag = 'sclist'
                    break
            
            if main_flag:
                break
        
        r_data = {
            'list': format_rdata(_search_result, main_flag),
            'timeslot': timeslot,
            'timestamp_list': timestamp_list[0],
            'main_flag': main_flag
        }
        
        return r_data

# Initialize UUID API
uuid_api = UuidAPI()

@router.post("/connect")
@log_execution_time(api_logger)
async def connect_cluster(request: UuidConnectRequest):
    """Connect to cluster and store UUID data"""
    try:
        # 必須フィールドのバリデーション
        validate_required_fields(request.dict(), ["cluster_name", "prism_ip"])
        
        api_logger.info(
            "Cluster connection started",
            event_type=EventType.DATA_CREATE,
            cluster_name=request.cluster_name,
            prism_ip=request.prism_ip
        )
        
        result = await uuid_api.connect_cluster(request)
        
        # データ収集完了後、UUID関連のキャッシュをクリア
        cleared_count = cache.clear_by_pattern(r"^uuid:")
        
        api_logger.info(
            "Cluster connection completed",
            event_type=EventType.DATA_CREATE,
            cluster_name=request.cluster_name,
            prism_ip=request.prism_ip,
            cache_cleared=cleared_count
        )
        
        return create_success_response(
            data=result,
            message="クラスター接続が成功しました",
            operation="connect_cluster"
        )
    except (ValidationError, AuthenticationError, NotFoundError) as e:
        api_logger.error(
            "Cluster connection validation failed",
            event_type=EventType.API_ERROR,
            cluster_name=request.cluster_name,
            prism_ip=request.prism_ip,
            error=str(e)
        )
        raise e
    except Exception as e:
        api_logger.error(
            "Cluster connection failed",
            event_type=EventType.API_ERROR,
            cluster_name=request.cluster_name,
            prism_ip=request.prism_ip,
            error=str(e)
        )
        log_error(e, "connect_cluster", {"cluster_name": request.cluster_name, "prism_ip": request.prism_ip})
        raise APIError(
            message="クラスター接続中にエラーが発生しました",
            details={"cluster_name": request.cluster_name, "prism_ip": request.prism_ip}
        )

@router.post("/latestdataset")
async def get_latest_dataset(request: UuidQueryRequest):
    """Get latest UUID dataset"""
    try:
        # 必須フィールドのバリデーション
        validate_required_fields(request.dict(), ["cluster"])
        
        cache_key = f"uuid:latestdataset:{request.cluster}"
        def _factory():
            return uuid_api.get_latestdataset(request.cluster)
        result = cache.get_or_set(cache_key, ttl_seconds=15, factory=_factory)
        if not result or not result.get('list'):
            raise NotFoundError(
                message="UUIDデータが見つかりません",
                details={"cluster": request.cluster}
            )
        
        return create_success_response(
            data=result,
            message="UUIDデータの取得が成功しました",
            operation="get_latest_dataset"
        )
    except (ValidationError, NotFoundError) as e:
        raise e
    except Exception as e:
        log_error(e, "get_latest_dataset", {"cluster": request.cluster})
        raise APIError(
            message="UUIDデータの取得中にエラーが発生しました",
            details={"cluster": request.cluster}
        )

@router.post("/searchdataset")
async def search_uuid_dataset(request: UuidSearchRequest):
    """Search UUID dataset"""
    try:
        # 必須フィールドのバリデーション
        validate_required_fields(request.dict(), ["cluster", "search"])
        
        result = uuid_api.get_contentdataset(request.cluster, request.search)
        return create_success_response(
            data=result,
            message="UUID検索が成功しました",
            operation="search_uuid_dataset"
        )
    except ValidationError as e:
        raise e
    except Exception as e:
        log_error(e, "search_uuid_dataset", {"cluster": request.cluster, "search": request.search})
        raise APIError(
            message="UUID検索中にエラーが発生しました",
            details={"cluster": request.cluster, "search": request.search}
        )

@router.post("/contentdataset")
async def get_content_dataset(request: UuidContentRequest):
    """Get UUID content dataset"""
    try:
        # 必須フィールドのバリデーション
        validate_required_fields(request.dict(), ["cluster", "content"])
        
        result = uuid_api.get_contentdataset(request.cluster, request.content)
        return create_success_response(
            data=result,
            message="UUIDコンテンツの取得が成功しました",
            operation="get_content_dataset"
        )
    except ValidationError as e:
        raise e
    except Exception as e:
        log_error(e, "get_content_dataset", {"cluster": request.cluster, "content": request.content})
        raise APIError(
            message="UUIDコンテンツの取得中にエラーが発生しました",
            details={"cluster": request.cluster, "content": request.content}
        )

@router.post("/cache/clear", response_model=Dict[str, Any])
async def clear_cache(pattern: Optional[str] = None) -> Dict[str, Any]:
    """キャッシュクリアAPI"""
    try:
        if pattern:
            cleared_count = cache.clear_by_pattern(pattern)
            message = f"パターン '{pattern}' にマッチする {cleared_count} 件のキャッシュをクリアしました"
            stats = cache.get_stats()
            return create_success_response({
                "cleared_count": cleared_count,
                "pattern": pattern,
                "cache_stats": stats
            }, message)
        else:
            stats_before = cache.get_stats()
            cache.clear()
            message = "すべてのキャッシュをクリアしました"
            stats = cache.get_stats()
            return create_success_response({
                "cleared_count": stats_before["total_items"],
                "pattern": pattern,
                "cache_stats": stats
            }, message)
    except Exception as e:
        log_error(e, "clear_cache", {"pattern": pattern})
        raise APIError(
            message="キャッシュクリア中にエラーが発生しました",
            details={"pattern": pattern}
        )

@router.get("/cache/stats", response_model=Dict[str, Any])
async def get_cache_stats() -> Dict[str, Any]:
    """キャッシュ統計情報取得API"""
    try:
        stats = cache.get_stats()
        return create_success_response(stats, "キャッシュ統計情報を取得しました")
    except Exception as e:
        log_error(e, "get_cache_stats")
        raise APIError(
            message="キャッシュ統計情報取得中にエラーが発生しました"
        )
