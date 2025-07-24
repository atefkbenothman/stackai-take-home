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
  isIndeterminate: (folderId: string, children?: FileItem[]) => boolean
  getSelectedItems: () => FileItem[]
  getSelectionSummary: () => {
    count: number
    totalSize: number
  }
}

export interface SelectionContextType
  extends SelectionState,
    SelectionActions {}
