// Indexing status for files
export type IndexingStatus =
  | "not-indexed"
  | "pending"
  | "indexing"
  | "indexed"
  | "error"

export interface FileItem {
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
  // Knowledge Base related fields
  indexingStatus?: IndexingStatus
  kbResourceId?: string // ID if file is in a knowledge base
  indexingError?: string // Error message if indexing failed
  lastIndexedAt?: string // Timestamp of last successful indexing
}

export interface FilesResponse {
  files: FileItem[]
  connection_id: string
  org_id: string
}

// Selection-related types
export interface SelectionState {
  selectedIds: Set<string>
  selectedItems: Map<string, FileItem>
  folderSelectionIntent: Set<string> // Folders marked as "selected" but not expanded yet
}

export interface SelectionActions {
  toggleSelection: (item: FileItem) => void
  toggleFolderSelection: (folder: FileItem, children?: FileItem[]) => void
  selectAll: (items: FileItem[]) => void
  clearSelection: () => void
  isSelected: (itemId: string) => boolean
  isIndeterminate: (folder: FileItem, children?: FileItem[]) => boolean
  getSelectedItems: () => FileItem[]
  getMinimalSelectedItems: () => FileItem[]
  getSelectionSummary: () => {
    count: number
    totalSize: number
  }
}

export interface SelectionContextType
  extends SelectionState,
    SelectionActions {}

// Knowledge Base types
export interface KnowledgeBase {
  knowledge_base_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  connection_id: string
  org_id: string
}

// Request to create a Knowledge Base
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

// Knowledge Base resource (file/folder in KB)
export interface KBResource {
  resource_id: string
  inode_type: "file" | "directory"
  inode_path: { path: string }
  status?: "pending" | "indexing" | "indexed" | "error"
  created_at?: string
  updated_at?: string
}

// Response from KB status endpoint
export interface KBStatusResponse {
  data: KBResource[]
}

// Indexing operation tracking
export interface IndexingOperation {
  knowledgeBaseId: string
  startedAt: string
  selectedFiles: FileItem[]
  status: "active" | "completed" | "failed"
}
