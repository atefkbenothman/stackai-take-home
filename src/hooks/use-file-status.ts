"use client"

import { useMemo, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getKnowledgeBaseStatus } from "@/lib/stack-ai-api"
import type {
  KBResource,
  ActiveIndexing,
  UseFileStatusReturn,
} from "@/lib/types"
import {
  mapKBStatusToIndexingStatus,
  updateFileIndexingStatus,
  getParentFolderPath,
} from "@/lib/utils"

export function useFileStatus(
  activeIndexing: ActiveIndexing | null,
): UseFileStatusReturn {
  const queryClient = useQueryClient()

  // Status polling query - queries parent folders and filters for selected files
  const { data: kbStatusData, isLoading: isPollingQuery } = useQuery({
    queryKey: ["kb-status", activeIndexing?.knowledgeBaseId],
    queryFn: async () => {
      if (!activeIndexing?.knowledgeBaseId) return null

      // Group files by parent folder paths and query each folder
      const allResults: KBResource[] = []
      
      // Get unique parent folder paths
      const parentFolders = new Set<string>()
      activeIndexing.selectedFiles.forEach(file => {
        const parentPath = getParentFolderPath(file.inode_path.path)
        parentFolders.add(parentPath)
      })

      // Query each parent folder
      for (const folderPath of parentFolders) {
        try {
          const folderStatus = await getKnowledgeBaseStatus(
            activeIndexing.knowledgeBaseId,
            folderPath  // Query parent folder path
          )
          allResults.push(...folderStatus.data)
        } catch (error) {
          console.warn(`Failed to get status for folder ${folderPath}:`, error)
          // Continue with other folders even if one fails
        }
      }

      // Filter results to only include files we actually selected
      const selectedPaths = new Set(activeIndexing.selectedFiles.map(f => f.inode_path.path))
      const filteredResults = allResults.filter(kbResource => 
        selectedPaths.has(kbResource.inode_path.path)
      )

      return { data: filteredResults }
    },
    enabled: !!activeIndexing,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    retry: 2,
  })

  const statusMap = useMemo(() => {
    if (!activeIndexing || !kbStatusData?.data)
      return new Map<string, KBResource>()

    const map = new Map<string, KBResource>()
    kbStatusData.data.forEach((kbResource: KBResource) => {
      map.set(kbResource.resource_id, kbResource)
    })

    return map
  }, [activeIndexing, kbStatusData])

  const statusValues = useMemo(() => {
    return Array.from(statusMap.values())
  }, [statusMap])

  // Update file status in cache when polling data changes
  useEffect(() => {
    if (!activeIndexing || !kbStatusData?.data) return

    // Update cache for each selected file based on KB status
    activeIndexing.selectedFiles.forEach((file) => {
      // First try exact resource ID match (works for files)
      let kbResource = statusMap.get(file.resource_id)

      // If no exact match and it's a directory, try path-based matching
      // This is needed because Stack AI changes directory IDs to STACK_VFS_VIRTUAL_DIRECTORY
      if (!kbResource && file.inode_type === "directory") {
        const pathMatches = statusValues.filter(
          (r) => r.inode_path.path === file.inode_path.path,
        )
        if (pathMatches.length > 0) {
          kbResource = pathMatches[0]
        }
      }

      if (kbResource) {
        const indexingStatus = mapKBStatusToIndexingStatus(
          kbResource.status,
          kbResource.resource_id,
        )

        // Store the actual Knowledge Base UUID for de-indexing operations
        updateFileIndexingStatus(
          queryClient,
          file.resource_id,
          indexingStatus,
          undefined,
          activeIndexing.knowledgeBaseId,
          file,
        )
      }
    })
  }, [statusMap, statusValues, activeIndexing, queryClient, kbStatusData])

  // Check if all files have reached a final state (indexed or error)
  const allFilesCompleted = useMemo(() => {
    if (!activeIndexing || statusMap.size === 0) return false

    const completed = activeIndexing.selectedFiles.every((file) => {
      // First try exact resource ID match (works for files)
      let kbResource = statusMap.get(file.resource_id)

      // If no exact match and it's a directory, try path-based matching
      if (!kbResource && file.inode_type === "directory") {
        kbResource = statusValues.find(
          (kb: KBResource) => kb.inode_path.path === file.inode_path.path,
        )
      }

      // If still no match, try path-based matching for files too (resource IDs might differ)
      if (!kbResource) {
        kbResource = statusValues.find(
          (kb: KBResource) => kb.inode_path.path === file.inode_path.path,
        )
      }

      if (!kbResource) {
        return false
      }

      // For virtual directories, undefined status means indexed
      if (
        file.inode_type === "directory" &&
        kbResource.resource_id === "STACK_VFS_VIRTUAL_DIRECTORY"
      ) {
        return true // Virtual directories are considered completed when they appear
      }

      // For regular files, check explicit status
      const isCompleted =
        kbResource.status === "indexed" || kbResource.status === "error"

      return isCompleted
    })

    return completed
  }, [activeIndexing, statusMap, statusValues])

  // Check if all files are successfully indexed (only "indexed" status, not "error")
  const allFilesSuccessful = useMemo(() => {
    if (!activeIndexing || statusMap.size === 0) return false

    const successful = activeIndexing.selectedFiles.every((file) => {
      // First try exact resource ID match (works for files)
      let kbResource = statusMap.get(file.resource_id)

      // If no exact match and it's a directory, try path-based matching
      if (!kbResource && file.inode_type === "directory") {
        kbResource = statusValues.find(
          (kb: KBResource) => kb.inode_path.path === file.inode_path.path,
        )
      }

      // If still no match, try path-based matching for files too (resource IDs might differ)
      if (!kbResource) {
        kbResource = statusValues.find(
          (kb: KBResource) => kb.inode_path.path === file.inode_path.path,
        )
      }

      if (!kbResource) {
        return false
      }

      // For virtual directories, undefined status means successfully indexed
      if (
        file.inode_type === "directory" &&
        kbResource.resource_id === "STACK_VFS_VIRTUAL_DIRECTORY"
      ) {
        return true // Virtual directories are considered successful when they appear
      }

      // For regular files, only "indexed" status is successful (not "error")
      return kbResource.status === "indexed"
    })

    return successful
  }, [activeIndexing, statusMap, statusValues])

  const isPolling = isPollingQuery && !!activeIndexing

  return {
    isPolling,
    updateFileStatus: updateFileIndexingStatus,
    allFilesCompleted,
    allFilesSuccessful,
  }
}
