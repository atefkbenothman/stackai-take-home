export type IndexingStatus =
  | "not-indexed"
  | "pending"
  | "indexing"
  | "indexed"
  | "error"

export interface RawFileFromAPI {
  resource_id: string
  inode_type: "directory" | "file"
  inode_path: {
    path: string
  }
  created_at: string
  modified_at: string
  dataloader_metadata?: {
    size?: number
    content_mime?: string
    web_url?: string
  }
}

export interface FileItem {
  resource_id: string
  inode_type: "directory" | "file"
  inode_path: {
    path: string
  }
  created_at: string
  modified_at: string
  parentId?: string
  dataloader_metadata?: {
    size?: number
    content_mime?: string
    web_url?: string
  }
  indexingStatus?: IndexingStatus
  kbResourceId?: string
  indexingError?: string
  lastIndexedAt?: string
}

export interface FilesResponse {
  files: FileItem[]
  connection_id: string
  org_id: string
}

export interface KnowledgeBase {
  knowledge_base_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  connection_id: string
  org_id: string
}

export interface CreateKnowledgeBaseRequest {
  connection_id: string
  connection_source_ids: string[]
  name: string
  description: string
  indexing_params: {
    ocr: boolean
    unstructured: boolean
    embedding_params: {
      embedding_model: string
      api_key: null
    }
    chunker_params: {
      chunk_size: number
      chunk_overlap: number
      chunker: string
    }
  }
  org_level_role: null
  cron_job_id: null
}

export interface KBResource {
  resource_id: string
  inode_type: "file" | "directory"
  inode_path: { path: string }
  status?: "pending" | "indexing" | "indexed" | "error"
  created_at?: string
  updated_at?: string
}

export interface KBStatusResponse {
  data: KBResource[]
}
