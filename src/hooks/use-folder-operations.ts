"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { fetchFiles } from "@/lib/stack-ai-api"
import type { FileItem, FilesResponse } from "@/lib/types"

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

  // Fetch folder data when expanded
  const {
    data: folderData,
    isLoading,
    error,
  } = useQuery<FilesResponse, Error>({
    queryKey: ["files", item.resource_id],
    queryFn: () => fetchFiles(item.resource_id),
    enabled: isFolder && isExpanded,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const toggleExpansion = useCallback(() => {
    if (!isFolder) return
    setIsExpanded((prev) => !prev)
  }, [isFolder])

  // Prefetch folder data on hover
  const prefetch = useCallback(() => {
    if (!isFolder || isExpanded) return
    queryClient.prefetchQuery({
      queryKey: ["files", item.resource_id],
      queryFn: () => fetchFiles(item.resource_id),
      staleTime: 5 * 60 * 1000,
    })
  }, [isFolder, isExpanded, queryClient, item.resource_id])

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`)
    }
  }, [error, item.inode_path.path, queryClient])

  return {
    isExpanded,
    folderData,
    isLoading,
    error,
    toggleExpansion,
    prefetch,
  }
}
