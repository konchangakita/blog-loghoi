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

router = APIRouter(prefix="/api/uuid", tags=["uuid"])

# Pydantic models
class UuidConnectRequest(BaseModel):
    cluster_name: str
    prism_ip: str
    prism_user: str
    prism_pass: str

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
            print(f"Cluster API response: {response.status_code}")
            if response.status_code != 200:
                print(f"Cluster API error: {response.text}")
        except requests.exceptions.ConnectTimeout:
            raise HTTPException(status_code=408, detail="Connection timeout")
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

    def connection_headers(self, prism_user: str, prism_pass: str) -> Dict[str, str]:
        """Create authentication headers"""
        encoded_credentials = b64encode(
            bytes(f"{prism_user}:{prism_pass}", encoding="ascii")
        ).decode("ascii")
        auth_header = f"Basic {encoded_credentials}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"{auth_header}",
            "cache-control": "no-cache",
        }
        print(f"Auth header created for user: {prism_user}")
        return headers

    def get_xdata(self, prism_ip: str, prism_user: str, prism_pass: str) -> Dict[str, Any]:
        """Get all UUID data from cluster"""
        res = {}
        headers = self.connection_headers(prism_user, prism_pass)
        
        res["cluster"] = self.get_cluster(prism_ip, headers)
        res["vms"] = self.get_vms(prism_ip, headers)
        res['storage_containers'] = self.get_storage_containers(prism_ip, headers)
        res['volume_groups'] = self.get_volume_groups(prism_ip, headers)
        res['vfilers'] = self.get_vfilers(prism_ip, headers)
        
        if res['vfilers'].status_code == 200:
            res_vfiler_json = res['vfilers'].json()
            if len(res_vfiler_json['entities']):
                res['shares'] = self.get_shares(prism_ip, headers)
                # Get share details if shares exist
                if res['shares'].status_code == 200:
                    res['res_share_details'] = []
            else:
                res['shares'] = None
                res['res_share_details'] = []
        else:
            res['shares'] = None
            res['res_share_details'] = []
        
        return res

    def connect_cluster(self, request: UuidConnectRequest) -> Dict[str, Any]:
        """Connect to cluster and store UUID data"""
        res = self.get_xdata(request.prism_ip, request.prism_user, request.prism_pass)
        
        # Check if cluster connection is successful
        if hasattr(res["cluster"], "status_code"):
            if res["cluster"].status_code == 200:
                # Store data in Elasticsearch
                data = es.put_data_uuid(res)
                time.sleep(1)
                return {"status": "success", "data": data}
            else:
                r_json = res["cluster"].json()
                error_msg = r_json["message_list"][0]["message"]
                raise HTTPException(status_code=400, detail=error_msg)
        else:  # timeout
            raise HTTPException(status_code=408, detail="Connection timeout")

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
async def connect_cluster(request: UuidConnectRequest):
    """Connect to cluster and store UUID data"""
    try:
        result = uuid_api.connect_cluster(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/latestdataset")
async def get_latest_dataset(request: UuidQueryRequest):
    """Get latest UUID dataset"""
    try:
        result = uuid_api.get_latestdataset(request.cluster)
        if not result or not result.get('list'):
            raise HTTPException(status_code=404, detail="No data found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/searchdataset")
async def search_uuid_dataset(request: UuidSearchRequest):
    """Search UUID dataset"""
    try:
        result = uuid_api.get_contentdataset(request.cluster, request.search)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/contentdataset")
async def get_content_dataset(request: UuidContentRequest):
    """Get UUID content dataset"""
    try:
        result = uuid_api.get_contentdataset(request.cluster, request.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
