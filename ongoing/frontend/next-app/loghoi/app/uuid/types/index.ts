// UUID Explorer Types

export interface UuidEntity {
  uuid: string
  name: string
  cluster_uuid?: string
  [key: string]: any
}

export interface VmEntity extends UuidEntity {
  niclist_uuid?: string[]
  disklist_uuid?: string[]
}

export interface VgEntity extends UuidEntity {
  attachment_list?: Array<{
    vm_uuid?: string
    iscsi_initiator_name?: string
  }>
  disklist?: Array<{
    vmdisk_uuid: string
    vmdisk_size_mb: number
  }>
}

export interface VfEntity extends UuidEntity {
  nvms?: Array<{
    uuid: string
    vmUuid: string
  }>
}

export interface ShareEntity extends UuidEntity {
  fileServerUuid: string
  containerUuid: string
  defaultQuotaPolicyUuid: string
}

export interface ScEntity extends UuidEntity {
  own_usage_bytes: number
  compression_enabled: boolean
  on_disk_dedup: string
  enable_software_encryption: boolean
  erasure_code: string
}

export interface UuidList {
  vmlist: Record<string, VmEntity>
  vglist: Record<string, VgEntity>
  vflist: Record<string, VfEntity>
  sharelist: Record<string, ShareEntity>
  sclist: Record<string, ScEntity>
}

export interface UuidResponse {
  list: UuidList
  cluster_name: string
  timestamp_list: {
    local_time: string
  }
}

export interface UuidSearchResponse extends UuidResponse {
  main_flag: string | null
  error?: string
}

export interface UuidContentResponse extends UuidResponse {
  main_flag: string | null
  error?: string
}

export interface QueryParams {
  pcip: string
  cluster: string
  prism?: string
}

export interface SearchParams extends QueryParams {
  search: string
}

export interface ContentParams extends QueryParams {
  content: string
}

export interface UuidHistoryItem {
  uuid: string
  timestamp: string
}
