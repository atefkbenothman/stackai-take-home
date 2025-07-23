import { useQuery } from "@tanstack/react-query"

interface FileItem {
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

interface FilesResponse {
  files: FileItem[]
  connection_id: string
  org_id: string
}

export function useFile(folderId?: string) {
  return useQuery({
    queryKey: folderId ? ["files", folderId] : ["files"],
    queryFn: async () => {
      const url = folderId ? `/api/files?folderId=${folderId}` : "/api/files"
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }

      const data: FilesResponse = await response.json()
      return data
    },
  })
}
