import { useState, useCallback, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { FileItem, FilesResponse } from "@/lib/types"
import { getFiles } from "@/lib/api/files"

interface UseFolderOperationsReturn {
  isExpanded: boolean
  toggleExpansion: () => void
  folderData: FilesResponse | undefined
  isLoading: boolean
  error: Error | null
  prefetch: () => void
}

export function useFolderOperations(item: FileItem): UseFolderOperationsReturn {
  const [isExpanded, setIsExpanded] = useState(false)
  const queryClient = useQueryClient()
  const isFolder = item.inode_type === "directory"

  const queryKey = useMemo(
    () => ["files", item.resource_id],
    [item.resource_id],
  )
  const queryFn = useCallback(
    () => getFiles(item.resource_id),
    [item.resource_id],
  )
  const staleTime = 5 * 60 * 1000

  // Fetch folder data when expanded
  const {
    data: folderData,
    isLoading,
    error,
  } = useQuery<FilesResponse, Error>({
    queryKey,
    queryFn,
    enabled: isFolder && isExpanded,
    staleTime,
    retry: 2,
  })

  const toggleExpansion = useCallback(() => {
    if (!isFolder) return
    setIsExpanded((prev) => !prev)
  }, [isFolder])

  // Prefetch folder data on hover
  const prefetch = useCallback(() => {
    if (!isFolder || isExpanded) return

    queryClient
      .prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      })
      .catch((error) => {
        console.debug("Prefetch failed for folder:", item.resource_id, error)
      })
  }, [
    isFolder,
    isExpanded,
    queryClient,
    item.resource_id,
    queryKey,
    queryFn,
    staleTime,
  ])

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`, {
        action: {
          label: "Retry",
          onClick: () => {
            queryClient.invalidateQueries({ queryKey })
          },
        },
      })
    }
  }, [error, item.inode_path.path, queryClient, queryKey])

  return {
    isExpanded,
    toggleExpansion,
    folderData,
    isLoading,
    error,
    prefetch,
  }
}
