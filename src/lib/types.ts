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
}

export interface FilesResponse {
  files: FileItem[]
  connection_id: string
  org_id: string
}

export interface FolderQueryResult {
  data: FilesResponse | undefined
  isLoading: boolean
  error: Error | null
}
