import { useQuery } from "@tanstack/react-query"
import type { FilesResponse } from "@/lib/types"

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
