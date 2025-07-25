"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { fetchFiles } from "@/lib/stack-ai-api"
import { useSelectionStore } from "@/stores/selection-store"
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
  const autoSelectNewlyFetchedChildren = useSelectionStore(
    (state) => state.autoSelectNewlyFetchedChildren,
  )

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
  }, [error, item.inode_path.path])

  // Auto-select newly fetched children if folder was marked for auto-selection
  useEffect(() => {
    if (folderData && isFolder) {
      autoSelectNewlyFetchedChildren(item.resource_id, queryClient)
    }
  }, [
    folderData,
    isFolder,
    item.resource_id,
    autoSelectNewlyFetchedChildren,
    queryClient,
  ])

  useEffect(() => {
    if (folderData && isFolder && folderData.files) {
      // Apply inheritance: if this folder has indexing status, apply it to children with no status
      if (
        item.indexingStatus &&
        (item.indexingStatus === "indexed" ||
          item.indexingStatus === "indexing" ||
          item.indexingStatus === "pending")
      ) {
        const childrenNeedingStatus = folderData.files.filter(
          (child) => !child.indexingStatus, // Only undefined/null status - respect explicit de-indexing
        )

        if (childrenNeedingStatus.length > 0) {
          // Apply inherited status to children
          childrenNeedingStatus.forEach((child) => {
            const targetQuery = child.parentId
              ? ["files", child.parentId]
              : ["files"]
            queryClient.setQueryData(
              targetQuery,
              (oldData: FilesResponse | undefined) => {
                if (!oldData) return oldData
                return {
                  ...oldData,
                  files: oldData.files.map((f) =>
                    f.resource_id === child.resource_id
                      ? {
                          ...f,
                          indexingStatus: item.indexingStatus,
                          kbResourceId: item.kbResourceId,
                          lastIndexedAt: new Date().toISOString(),
                        }
                      : f,
                  ),
                }
              },
            )
          })
        }
      }
    }
  }, [folderData, isFolder, item, queryClient])

  return {
    isExpanded,
    folderData,
    isLoading,
    error,
    toggleExpansion,
    prefetch,
  }
}
