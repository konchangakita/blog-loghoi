from base64 import b64encode
import requests
import time
import paramiko
import re

import common
import ela

es = ela.ElasticGateway()

# Common from Elastic and local Sample data
def format_rdata(data, main_flag=False):
    r_data = {}

    if ('uuid_vms' in data):
        vmlist = []
        for vm in data['uuid_vms']:
            _data = {}
            _data['name'] = vm['name']
            _data['uuid'] = vm['uuid']
            _data['cluster_uuid'] = vm['cluster_uuid']

            #v3じゃないとわからない
            #if ( main_flag == 'vmlist' ):
                #print(vm['spec']['resources']['nic_list'])
                #if ( 'nic_list' in vm['spec']['resources'] ):
                #    _data['niclist_uuid'] = [niclist['uuid'] for niclist in vm['spec']['resources']['nic_list']]
                #if ( 'disk_list' in vm['spec']['resources'] ):
                #    _data['disklist_uuid'] = [niclist['uuid'] for niclist in vm['spec']['resources']['disk_list']]
            
            vmlist.append(_data)
        r_data['vmlist'] = vmlist

    if ('uuid_volume_groups' in data):
        vglist = []
        for vg in data['uuid_volume_groups']:
            _data = {}
            _data['name'] = vg['name']
            _data['uuid'] = vg['uuid']
            _data['cluster_uuid'] = vg['cluster_uuid']

            if ( main_flag == 'vglist' ):
                _data['disklist']  = vg['disk_list']
                if ( 'attachment_list' in vg):
                    _data['attachment_list'] = vg['attachment_list'] 
        
            vglist.append(_data)
        r_data['vglist'] = vglist

    if ('uuid_vfilers' in data):
        vflist = []
        for vf in data['uuid_vfilers']:
            _data = {}
            _data['name'] = vf['name']
            _data['uuid'] = vf['uuid']
            _data['cluster_uuid'] = vf['cluster_uuid']

            if( main_flag == 'vflist' ):
                _data['nvms'] =  [nvms for nvms in vf['nvms']]

            vflist.append(_data)
        r_data['vflist'] = vflist

    if ('uuid_shares' in data):
        sharelist = []
        for sh in data['uuid_shares']:
            _data = {}
            _data['name'] = sh['name']
            _data['uuid'] = sh['uuid']
            _data['cluster_uuid'] = sh['cluster_uuid']

            if ( main_flag == 'sharelist' ):
                _data['fileServerName'] = sh['fileServerName']
                _data['fileServerUuid'] = sh['fileServerUuid']
                _data['containerUuid'] = sh['containerUuid']

                _data['defaultQuotaPolicyUuid'] = sh['defaultQuotaPolicyUuid']
            sharelist.append(_data)
        r_data['sharelist'] = sharelist
    elif ( 'uuid_share_details' in data ):
        sharelist = []
        for sh in data['uuid_share_details']:
            _data = {}
            _data['name'] = sh['Share name']
            _data['uuid'] = sh['Share UUID']
            sharelist.append(_data)
        r_data['sharelist'] = sharelist

    if ('uuid_storage_containers' in data):
        sclist = []
        for sc in data['uuid_storage_containers']:
            _data = {}
            _data['name'] = sc['name']
            _data['uuid'] = sc['storage_container_uuid']
            _data['cluster_uuid'] = sc['cluster_uuid']

            if( main_flag == 'sclist'):
                _data['own_usage_bytes'] = sc['usage_stats']['storage.user_container_own_usage_bytes']
                _data['compression_enabled'] = sc['compression_enabled']
                _data['on_disk_dedup'] = sc['on_disk_dedup']
                _data['erasure_code'] = sc['erasure_code']
                _data['enable_software_encryption'] = sc['enable_software_encryption']
            sclist.append(_data)
        r_data['sclist'] = sclist

    return r_data



def format_document(_hits):
    doc = {}
    for _hit in _hits:
        index_name = _hit['_index']
        if ( not index_name in doc ):
            doc[index_name] = []

        doc[index_name].append(_hit['_source'])
    
    return doc





class UuidAPI:
    def get_cluster(self, prism_ip, headers):
        request_url = "https://" + prism_ip + ":9440/PrismGateway/services/rest/v2.0/cluster/"
        try:
            response = requests.request(
                "get", request_url, headers=headers, verify=False, timeout=3.5
            )
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_vms(self, prism_ip, headers):
        request_url = 'https://' + prism_ip + ':9440/PrismGateway/services/rest/v2.0/vms/'
        try:
            response = requests.request('get', request_url, headers=headers, verify=False, timeout=3.5)
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_volume_groups(self, prism_ip, headers):
        request_url = 'https://' + prism_ip + ':9440/PrismGateway/services/rest/v2.0/volume_groups/'
        try:
            response = requests.request('get', request_url, headers=headers, verify=False, timeout=3.5)
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_storage_containers(self, prism_ip, headers):
        request_url = 'https://' + prism_ip + ':9440/PrismGateway/services/rest/v2.0/storage_containers/'
        try:
            response = requests.request('get', request_url, headers=headers, verify=False, timeout=3.5)
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_vfilers(self, prism_ip, headers):
        request_url = 'https://' + prism_ip + ':9440/PrismGateway/services/rest/v1/vfilers/'
        try:
            response = requests.request('get', request_url, headers=headers, verify=False, timeout=3.5)
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_shares(self, prism_ip, headers):
        request_url = 'https://' + prism_ip + ':9440/PrismGateway/services/rest/v1/vfilers/shares/'
        try:
            response = requests.request('get', request_url, headers=headers, verify=False, timeout=3.5)
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        return response

    def get_share_details(self, prism_ip, prism_user, prism_pass, vfilers_json):
        #ParamikoでFileServerにアクセスするためのIPを抽出
        response = ''
        shares = []
        _shares = {}

        fsvm_ips_list = []
        for _vfiler in vfilers_json['entities']:
            if _vfiler['internalNetwork'] != None: #inactiveなFile Serverがあった場合のエラーを回避
                #print(_vfiler['internalNetwork']['pool'])
                internalNetwork_pool_list=_vfiler['internalNetwork']['pool'][0]
                fsvm_ip = internalNetwork_pool_list.split(' ')[0]
                #print(fsvm_ip)
                fsvm_ips_list.append(fsvm_ip)
                #print(fsvm_ips_list)

        for ssh_target_ip in fsvm_ips_list:
            #print('ssh_target_ip>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            #print(ssh_target_ip)
            client = paramiko.SSHClient()
            #client.set_missing_host_key_policy(paramiko.WarningPolicy())
            #client.connect(prism_ip, username=prism_user, password=prism_pass)
            client.load_system_host_keys()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(prism_ip,username=prism_user,password=prism_pass,look_for_keys=False,allow_agent=False)

            afscmd = "/home/nutanix/minerva/bin/afs -H {}:7502 share.list"
            afscmd =  afscmd.format(ssh_target_ip)

            stdin, stdout, stderr = client.exec_command(afscmd)

            for line in stdout:
                tmp = line.strip()
                keyvalue = re.split(': ', tmp)
                #if keyvalue[0] == 'Share name':
                    #print('start')
                if len(keyvalue) == 2:
                    _shares[keyvalue[0]] = keyvalue[1]
                if keyvalue[0] == '':
                    #print(_shares)
                    #print('end')
                    shares.append(_shares)
                    #print(shares)
                    _shares = {}

            #response.append(shares)

            client.close()
            del client, stdin, stdout, stderr

        #print('shares>>>>>>>>>>>>>')
        #print(shares)

        return shares



class UuidGateway(UuidAPI):
    def connection_headers(self, prism_user, prism_pass):
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
        return headers

    def get_xdata(self, prism_ip, prism_user, prism_pass):
        res = {}
        res_share_details = ""

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
                share_details = self.get_share_details(prism_ip, prism_user, prism_pass, res_vfiler_json)
                res['res_share_details'] = share_details

        return res

    def connect_cluster(self, request):
        cluster_name = request["cluster_name"]
        prism_ip = request["prism_ip"]
        prism_user = request["prism_user"]
        prism_pass = request["prism_pass"]
        res = self.get_xdata(prism_ip, prism_user, prism_pass)

        print(">>>>>>>>>>>> res", res)

        # connecting cluster?
        if hasattr(res["cluster"], "status_code"):
            if res["cluster"].status_code == 200:
                # input to Elasticsearch
                #cluster_name, input_size = es.put_data_uuid(res)
                data = es.put_data_uuid(res)
                time.sleep(1)
                info = "Success"
            else:
                r_json = res["cluster"].json()
                info = r_json["message_list"][0]["message"]
        else:  # timeout
            info = "timeout (wrong IP?)"

        return data



    def get_alllist(self, timestamp_utcstr, cluster_name):
        alllist = {}
        _hits = es.get_uuidall_document(timestamp_utcstr, cluster_name)
        alllist = format_document(_hits)
        return alllist

    def get_latestdataset(self, cluster_name):
        timeslot = es.get_timeslot(cluster_name)
        #print('>>>>>>>>>>>>>>>> timeslot', timeslot)
        #if 'timestamp' in req:
        #    timestamp_utcstr = req['timestamp']
        #else:
        #    timestamp_utcstr = timeslot[0]['utc_time']
        timestamp_utcstr = timeslot[0]['utc_time']

        timestamp_list = common.change_timestamp(timestamp_utcstr)

        data = self.get_alllist(timestamp_utcstr, cluster_name)

        r_data = {}
        r_data['list'] = format_rdata(data)
        r_data['cluster_name'] = cluster_name
        r_data['timeslot'] = timeslot
        r_data['timestamp_list'] = timestamp_list[0]

        return r_data

    def get_contentdataset(self, cluster_name, key_uuid):
        timeslot = es.get_timeslot(cluster_name)
        if (not timeslot): 
            return 'nonexistent in Elasticsearch'
        
        # 時間選べるようにする？
        timestamp_utcstr = timeslot[0]['utc_time']
        timestamp = timestamp_utcstr
        timestamp_list = common.change_timestamp(timestamp_utcstr)
        print(timestamp)

        alias = 'search_uuid'
        hits = es.search_uuid_document(alias, timestamp, cluster_name, key_uuid)
        search_result = format_document(hits)

        # vm, volume group, storage container,,,,
        main_flag =''
        _search_result = search_result.copy()
        for index in search_result:
            for entity in search_result[index]:
                if ( index == 'uuid_vms' and entity['uuid'] == key_uuid ):
                    main_flag = 'vmlist'
                    break
                if ( index == 'uuid_volume_groups' and entity['uuid'] == key_uuid ):
                    main_flag = 'vglist'
                    multi_query = []
                    # storage_containers
                    query = { "match_phrase": { "storage_container_uuid.keyword": entity['disk_list'][0]['container_uuid'] }}
                    multi_query.append(query)
                    # share_details
                    if ( entity['name'].startswith('NTNX') and entity['name'].count('-') >= 10 ):
                        _vgsetuuid = entity['name'].split('-', 2)[2]
                        vgsetuuid = _vgsetuuid.rsplit('-', 5)[0]
                        query = { "match_phrase": { "Volume group set UUID.keyword": vgsetuuid }}
                        multi_query.append(query)
                    # VMs
                    if ( 'attachment_list' in entity ):
                        for uuid_list in entity['attachment_list']:
                            if ( 'vm_uuid' in uuid_list ):
                                query = { "match_phrase": { "uuid.keyword": uuid_list['vm_uuid'] }}
                                multi_query.append(query)
                            if ( 'iscsi_initiator_name' in uuid_list ):
                                nvms_uuid = uuid_list['iscsi_initiator_name'].split((':'))[1]
                                query = { "match_phrase": { "nvms.uuid.keyword": nvms_uuid }}
                                multi_query.append(query)

                    result = es.search_uuidadditional_document(alias, timestamp, cluster_name, multi_query)
                    _result = format_document(result)
                    _search_result['uuid_storage_containers'] = _result['uuid_storage_containers']
                    if ( 'uuid_share_details' in _result ):
                        _search_result['uuid_share_details'] = _result['uuid_share_details']
                    if ( 'uuid_vms' in _result ):
                        _search_result['uuid_vms'] = _result['uuid_vms']
                    if ( 'uuid_vfilers' in _result ):
                        _search_result['uuid_vfilers'] = _result['uuid_vfilers']
                    break

                elif( index == 'uuid_vfilers' and entity['uuid'] == key_uuid ):
                    main_flag = 'vflist'
                    # picup vmuuid
                    if ( entity['nvms'] ):
                        multi_query = []
                        for nvms in entity['nvms']:
                            # FSVM(vms)
                            query = { "match_phrase": { "uuid.keyword": nvms['vmUuid'] }}
                            multi_query.append(query)
                            # Volumes(volume_groups)
                            query = { "match_phrase": { "attachment_list.iscsi_initiator_name": nvms['uuid'] }}
                            multi_query.append(query)
                        result = es.search_document_additional(alias, timestamp, cluster_name, multi_query)
                        _result = format_document(result)
                        _search_result['vms'] = _result['vms']
                        if ( 'uuid_volume_groups' in _result ):
                            _search_result['uuid_volume_groups'] = _result['uuid_volume_groups']
                    break

                elif( index == 'uuid_shares' and entity['uuid'] == key_uuid ):
                    main_flag = 'sharelist'
                    multi_query = []
                    # FileServer(vFilers)
                    query = { "match_phrase": { "uuid.keyword": entity['fileServerUuid'] }}
                    multi_query.append(query)
                    # Volume group from share detailes
                    if(search_result['uuid_share_details']):
                        query = { "match_phrase": { "name": search_result['uuid_share_details'][0]['Volume group set UUID'] }}
                        multi_query.append(query)
                    result = es.search_document_additional(alias, timestamp, cluster_name, multi_query)
                    _result = format_document(result)
                    _search_result['uuid_vfilers'] = _result['uuid_vfilers']
                    _search_result['uuid_volume_groups'] = _result['uuid_volume_groups']
                    break

                elif( index == 'uuid_storage_containers'):
                    main_flag = 'sclist'
                    break

            if (main_flag):
                break

        r_data = {}
        search_result = _search_result
        print('main_flag: ', main_flag)
        r_data['list'] = format_rdata(search_result, main_flag)
        r_data['timeslot'] = timeslot
        r_data['timestamp_list'] = timestamp_list[0]
        r_data['main_flag'] = main_flag
        print('serch result >>>>>>>>>>>>>>>>>>>> ', r_data['list'].keys())

        return r_data