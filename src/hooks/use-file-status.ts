"use client"

import { useMemo, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getKnowledgeBaseStatus } from "@/lib/stack-ai-api"
import type {
  KBResource,
  ActiveIndexing,
  UseFileStatusReturn,
  FilesResponse,
  FileItem,
} from "@/lib/types"
import {
  mapKBStatusToIndexingStatus,
  updateFileIndexingStatus,
  getParentFolderPath,
  aggregateFolderStatus,
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

      // Handle both individual files and folders differently
      const allResults: KBResource[] = []

      // Separate selected items into files and folders
      const selectedFiles = activeIndexing.selectedFiles.filter(
        (f) => f.inode_type === "file",
      )
      const selectedFolders = activeIndexing.selectedFiles.filter(
        (f) => f.inode_type === "directory",
      )

      // For individual files: query their parent folders
      if (selectedFiles.length > 0) {
        const parentFolders = new Set<string>()
        selectedFiles.forEach((file) => {
          const parentPath = getParentFolderPath(file.inode_path.path)
          parentFolders.add(parentPath)
        })

        for (const folderPath of parentFolders) {
          try {
            const folderStatus = await getKnowledgeBaseStatus(
              activeIndexing.knowledgeBaseId,
              folderPath,
            )
            allResults.push(...folderStatus.data)
          } catch (error) {
            console.warn(
              `Failed to get status for folder ${folderPath}:`,
              error,
            )
          }
        }
      }

      // For selected folders: query their contents to get child file statuses
      for (const folder of selectedFolders) {
        try {
          const folderContents = await getKnowledgeBaseStatus(
            activeIndexing.knowledgeBaseId,
            folder.inode_path.path, // Query the folder itself
          )

          // Update TanStack Query cache with child files and their statuses
          queryClient.setQueryData(
            ["files", folder.resource_id], // Folder's file query cache
            (oldData: FilesResponse | undefined) => {
              // Create a map of existing files for easy lookup
              const existingFilesMap = new Map<string, FileItem>()
              if (oldData?.files) {
                oldData.files.forEach((file) => {
                  existingFilesMap.set(file.resource_id, file)
                })
              }

              // Process KB resources and merge with existing data
              const updatedItems = folderContents.data
                .filter(
                  (kbResource) =>
                    kbResource.resource_id !== "STACK_VFS_VIRTUAL_DIRECTORY",
                ) // Skip virtual directories
                .map((kbResource) => {
                  // Generate unique ID for potential duplicates
                  const uniqueId =
                    kbResource.resource_id === "STACK_VFS_VIRTUAL_DIRECTORY"
                      ? `${kbResource.resource_id}-${kbResource.inode_path.path.replace(/\//g, "-")}`
                      : kbResource.resource_id

                  // Check if file already exists in cache
                  const existingFile = existingFilesMap.get(uniqueId)

                  if (existingFile) {
                    // Merge indexing status with existing file data to preserve original metadata
                    return {
                      ...existingFile, // Preserve all original data including modified_at, created_at, dataloader_metadata
                      // Only update indexing-related fields
                      indexingStatus: kbResource.status
                        ? mapKBStatusToIndexingStatus(
                            kbResource.status,
                            kbResource.resource_id,
                          )
                        : existingFile.indexingStatus,
                      kbResourceId: kbResource.status
                        ? activeIndexing.knowledgeBaseId
                        : existingFile.kbResourceId,
                      lastIndexedAt: kbResource.status
                        ? kbResource.created_at
                        : existingFile.lastIndexedAt,
                    }
                  } else {
                    // Create new FileItem object for files not in cache (shouldn't happen often)
                    const baseItem: FileItem = {
                      resource_id: uniqueId,
                      inode_type: kbResource.inode_type as "file" | "directory",
                      inode_path: kbResource.inode_path,
                      created_at: kbResource.created_at || "",
                      modified_at: kbResource.updated_at || "",
                      parentId: folder.resource_id,
                      // Optional fields with defaults
                      dataloader_metadata: undefined,
                      indexingStatus: kbResource.status
                        ? mapKBStatusToIndexingStatus(
                            kbResource.status,
                            kbResource.resource_id,
                          )
                        : undefined,
                      kbResourceId: kbResource.status
                        ? activeIndexing.knowledgeBaseId
                        : undefined,
                      indexingError: undefined,
                      lastIndexedAt: kbResource.status
                        ? kbResource.created_at
                        : undefined,
                    }

                    return baseItem
                  }
                })

              // Get IDs of items we're updating
              const updatedIds = new Set(
                updatedItems.map((item) => item.resource_id),
              )

              // Preserve existing items that aren't being updated, merge with updated items
              const preservedItems = (oldData?.files || []).filter(
                (existingItem) => !updatedIds.has(existingItem.resource_id),
              )

              const allItems = [...preservedItems, ...updatedItems]

              return {
                files: allItems,
                connection_id: oldData?.connection_id || "",
                org_id: oldData?.org_id || "",
              }
            },
          )

          // Aggregate child file statuses into folder status
          const aggregatedStatus = aggregateFolderStatus(folderContents.data)

          // Create a synthetic KB resource for the folder with aggregated status
          const folderResource: KBResource = {
            resource_id: folder.resource_id,
            inode_type: "directory",
            inode_path: folder.inode_path,
            status: aggregatedStatus,
          }

          allResults.push(folderResource)
        } catch (error) {
          console.warn(
            `Failed to get contents for folder ${folder.inode_path.path}:`,
            error,
          )
        }
      }

      // Filter results to only include files we actually selected
      const selectedPaths = new Set(
        activeIndexing.selectedFiles.map((f) => f.inode_path.path),
      )
      const filteredResults = allResults.filter((kbResource) =>
        selectedPaths.has(kbResource.inode_path.path),
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
