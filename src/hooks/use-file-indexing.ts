"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  fetchFiles,
  triggerKnowledgeBaseSync,
  getKnowledgeBaseStatus,
  deleteFromKnowledgeBase,
} from "@/lib/stack-ai-api"
import type {
  FileItem,
  KBResource,
  FilesResponse,
  IndexingStatus,
} from "@/lib/types"
import type { QueryClient, Query } from "@tanstack/react-query"

/**
 * Map KB resource status to our IndexingStatus
 * For virtual directories (folders), undefined status means successfully indexed
 */
function mapKBStatusToIndexingStatus(
  kbStatus?: string,
  resourceId?: string,
): "pending" | "indexing" | "indexed" | "error" {
  switch (kbStatus) {
    case "pending":
      return "indexing" // API "pending" means actively being processed = UI "indexing"
    case "indexed":
      return "indexed"
    case "error":
      return "error"
    case undefined:
      // Virtual directories (STACK_VFS_VIRTUAL_DIRECTORY) don't have status fields
      // If they appear in KB responses, they're successfully indexed as directory structure
      if (resourceId === "STACK_VFS_VIRTUAL_DIRECTORY") {
        return "indexed"
      }
      return "indexing" // Default for other cases
    default:
      return "indexing" // Default to indexing since we're polling an active KB
  }
}

/**
 * Extract the parent folder path from a file's inode_path
 * Examples:
 * - "file.txt" → "/"
 * - "papers/react_paper.pdf" → "/papers"
 * - "classes/cs101/homework.pdf" → "/classes/cs101"
 */
function getParentFolderPath(inodePath: string): string {
  const lastSlashIndex = inodePath.lastIndexOf("/")
  if (lastSlashIndex === -1) {
    return "/" // Root level file
  }
  const folderPath = inodePath.substring(0, lastSlashIndex)
  return folderPath === "" ? "/" : `/${folderPath}`
}

/**
 * Group files by their parent folder paths to minimize KB status API calls
 */
function groupFilesByFolder(files: FileItem[]): Map<string, FileItem[]> {
  const folderMap = new Map<string, FileItem[]>()

  files.forEach((file) => {
    const folderPath = getParentFolderPath(file.inode_path.path)
    const existing = folderMap.get(folderPath) || []
    folderMap.set(folderPath, [...existing, file])
  })

  return folderMap
}

/**
 * Shared utility to update file indexing status in TanStack Query cache
 * This updates all relevant file caches to maintain consistency
 */
function updateFileIndexingStatus(
  queryClient: QueryClient,
  resourceId: string,
  status: IndexingStatus,
  error?: string,
  knowledgeBaseId?: string,
) {
  // Update root files cache
  queryClient.setQueryData(["files"], (oldData: FilesResponse | undefined) => {
    if (!oldData) return oldData

    return {
      ...oldData,
      files: oldData.files.map((file: FileItem) =>
        file.resource_id === resourceId
          ? {
              ...file,
              indexingStatus: status,
              indexingError: error,
              kbResourceId:
                status === "indexed" && knowledgeBaseId
                  ? knowledgeBaseId
                  : status === "not-indexed"
                    ? undefined
                    : file.kbResourceId,
              lastIndexedAt:
                status === "indexed"
                  ? new Date().toISOString()
                  : file.lastIndexedAt,
            }
          : file,
      ),
    }
  })

  // Update folder-specific caches that might contain this file
  const queryCache = queryClient.getQueryCache()
  queryCache.getAll().forEach((query: Query) => {
    if (query.queryKey[0] === "files" && query.queryKey[1]) {
      queryClient.setQueryData(
        query.queryKey,
        (oldData: FilesResponse | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            files: oldData.files.map((file: FileItem) =>
              file.resource_id === resourceId
                ? {
                    ...file,
                    indexingStatus: status,
                    indexingError: error,
                    kbResourceId:
                      status === "indexed" && knowledgeBaseId
                        ? knowledgeBaseId
                        : status === "not-indexed"
                          ? undefined
                          : file.kbResourceId,
                    lastIndexedAt:
                      status === "indexed"
                        ? new Date().toISOString()
                        : file.lastIndexedAt,
                  }
                : file,
            ),
          }
        },
      )
    }
  })
}

interface UseFileIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  deindexFile: (file: FileItem) => void
  batchDeindexFiles: (selectedItems: FileItem[]) => void
  cancelIndexing: () => void
  isIndexing: boolean
  isPolling: boolean
  isActive: boolean
  activeIndexing: {
    knowledgeBaseId: string
    selectedFiles: FileItem[]
    startTime: number
  } | null
}

async function indexFilesAPI(selectedItems: FileItem[]) {
  // Get connection info (like notebook step 1.1)
  const filesData = await fetchFiles()
  const connectionId = filesData.connection_id

  if (!connectionId) {
    throw new Error("Could not determine connection ID for KB creation")
  }

  // Extract resource IDs (like notebook section 2)
  const selectedResourceIds = selectedItems.map((item) => item.resource_id)

  // Create KB with files included (like notebook section 2.1)
  const newKb = await createKnowledgeBase(
    connectionId,
    selectedResourceIds, // Include files in creation
    `File Picker KB - ${new Date().toISOString()}`,
    "Knowledge Base created via file picker",
  )

  // Trigger sync (like notebook section 2.2)
  await triggerKnowledgeBaseSync(newKb.knowledge_base_id)

  return { knowledgeBaseId: newKb.knowledge_base_id, selectedItems }
}

async function deindexFileAPI(file: FileItem) {
  if (!file.kbResourceId) {
    throw new Error("File is not indexed - missing Knowledge Base ID")
  }

  // Use the resource path for deletion as per the Jupyter notebook
  await deleteFromKnowledgeBase(file.kbResourceId, file.inode_path.path)

  return { file }
}

async function batchDeindexFilesAPI(selectedItems: FileItem[]) {
  // Filter to only indexed files that have KB resource IDs
  const indexedFiles = selectedItems.filter(
    (item) => item.indexingStatus === "indexed" && item.kbResourceId,
  )

  if (indexedFiles.length === 0) {
    throw new Error("No indexed files found in selection")
  }

  // De-index each file from its respective Knowledge Base
  const results = await Promise.allSettled(
    indexedFiles.map(async (file) => {
      await deleteFromKnowledgeBase(file.kbResourceId!, file.inode_path.path)
      return file
    }),
  )

  // Check for failures
  const failures = results.filter((result) => result.status === "rejected")
  if (failures.length > 0) {
    const firstError = (failures[0] as PromiseRejectedResult).reason
    throw new Error(`Failed to de-index some files: ${firstError.message}`)
  }

  return { selectedItems: indexedFiles }
}

export function useFileIndexing(): UseFileIndexingReturn {
  const queryClient = useQueryClient()
  const [activeIndexing, setActiveIndexing] = useState<{
    knowledgeBaseId: string
    selectedFiles: FileItem[]
    startTime: number
  } | null>(null)

  // Knowledge Base indexing mutation following notebook pattern
  const mutation = useMutation({
    mutationFn: indexFilesAPI,
    onMutate: async (selectedItems: FileItem[]) => {
      if (selectedItems.length === 0) {
        toast.error("No files selected for indexing")
        throw new Error("No files selected")
      }

      // Prevent multiple simultaneous indexing operations
      if (activeIndexing) {
        toast.error("Another indexing operation is already in progress")
        throw new Error("Indexing already in progress")
      }

      // Optimistically update all selected files to "pending" status
      selectedItems.forEach((item) => {
        updateFileIndexingStatus(queryClient, item.resource_id, "pending")
      })

      toast.info("Indexing files...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { knowledgeBaseId, selectedItems } = data

      // Immediately set files to "indexing" status since KB creation succeeded
      selectedItems.forEach((item) => {
        updateFileIndexingStatus(
          queryClient,
          item.resource_id,
          "indexing",
          undefined,
          knowledgeBaseId,
        )
      })

      // Start status polling
      setActiveIndexing({
        knowledgeBaseId,
        selectedFiles: selectedItems,
        startTime: Date.now(),
      })

      toast.success(
        `Indexing ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`,
      )
    },
    onError: (error, selectedItems) => {
      // Rollback optimistic updates - set files back to "error"
      selectedItems.forEach((item) => {
        updateFileIndexingStatus(
          queryClient,
          item.resource_id,
          "error",
          error instanceof Error ? error.message : "Unknown error",
        )
      })

      toast.error(
        `Failed to index files: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  // Status polling query - checks all folders containing indexed files
  const { data: kbStatusData, isLoading: isPollingQuery } = useQuery({
    queryKey: ["kb-status", activeIndexing?.knowledgeBaseId],
    queryFn: async () => {
      if (!activeIndexing?.knowledgeBaseId) return null

      try {
        // Group files by their parent folder paths
        const folderGroups = groupFilesByFolder(activeIndexing.selectedFiles)
        const allResults: KBResource[] = []

        // Group files by folder paths for efficient querying

        // Also query root path to check for root-level folders
        try {
          const rootStatus = await getKnowledgeBaseStatus(
            activeIndexing.knowledgeBaseId,
            "/",
          )
          allResults.push(...rootStatus.data)
        } catch (rootError) {
          console.warn("Failed to query KB root path:", rootError)
        }

        // Query each folder's status separately
        for (const [folderPath, filesInFolder] of folderGroups) {
          try {
            const folderStatus = await getKnowledgeBaseStatus(
              activeIndexing.knowledgeBaseId,
              folderPath,
            )

            allResults.push(...folderStatus.data)

            // Also try querying each folder's direct path for additional resources
            for (const file of filesInFolder) {
              if (file.inode_type === "directory") {
                const directPath = `/${file.inode_path.path}`
                const directStatus = await getKnowledgeBaseStatus(
                  activeIndexing.knowledgeBaseId,
                  directPath,
                )
                allResults.push(...directStatus.data)
              }
            }
          } catch (folderError) {
            // Log folder-specific errors but continue with other folders
            console.warn(
              `Failed to get status for folder ${folderPath}:`,
              folderError,
            )
          }
        }

        // Return all collected status results

        return { data: allResults }
      } catch (err) {
        throw err
      }
    },
    enabled: !!activeIndexing,
    refetchInterval: 3000, // Poll every 3 seconds to catch brief "indexing" status
    refetchIntervalInBackground: true,
    retry: 2,
  })

  // Update file status in cache when polling data changes
  useEffect(() => {
    if (!kbStatusData?.data || !activeIndexing) {
      return
    }

    // Process status updates for all selected files

    // Create a map of resource_id to status for quick lookup
    const statusMap = new Map<string, KBResource>()
    kbStatusData.data.forEach((kbResource: KBResource) => {
      statusMap.set(kbResource.resource_id, kbResource)
    })

    // Update cache for each selected file based on KB status
    activeIndexing.selectedFiles.forEach((file) => {
      // First try exact resource ID match (works for files)
      let kbResource = statusMap.get(file.resource_id)

      // If no exact match and it's a directory, try path-based matching
      // (Stack AI creates virtual directories with different resource IDs)
      if (!kbResource && file.inode_type === "directory") {
        const pathMatches = Array.from(statusMap.values()).filter(
          (r) => r.inode_path.path === file.inode_path.path,
        )
        if (pathMatches.length > 0) {
          kbResource = pathMatches[0] // Use the first path match
        }
      }

      if (kbResource) {
        const indexingStatus = mapKBStatusToIndexingStatus(
          kbResource.status,
          kbResource.resource_id,
        )

        // Always store the actual Knowledge Base UUID for de-indexing operations
        // (The virtual directory ID is only used for status matching, not storage)
        updateFileIndexingStatus(
          queryClient,
          file.resource_id,
          indexingStatus,
          undefined,
          activeIndexing.knowledgeBaseId, // Always use the real KB UUID
        )
      }
    })
  }, [kbStatusData, activeIndexing, queryClient])

  // Check if all files have reached a final state (indexed or error)
  const allFilesCompleted = activeIndexing
    ? activeIndexing.selectedFiles.every((file) => {
        if (!kbStatusData?.data) return false

        // First try exact resource ID match (works for files)
        let kbResource = kbStatusData.data.find(
          (kb: KBResource) => kb.resource_id === file.resource_id,
        )

        // If no exact match and it's a directory, try path-based matching
        if (!kbResource && file.inode_type === "directory") {
          kbResource = kbStatusData.data.find(
            (kb: KBResource) => kb.inode_path.path === file.inode_path.path,
          )
        }

        if (!kbResource) return false

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
    : false

  // Stop polling when all files are completed or timeout reached
  useEffect(() => {
    if (allFilesCompleted && activeIndexing) {
      setActiveIndexing(null)
      toast.success("Indexing completed!")
    }
  }, [allFilesCompleted, activeIndexing])

  // Timeout after 5 minutes to prevent infinite polling
  useEffect(() => {
    if (!activeIndexing) return

    const timeoutMs = 5 * 60 * 1000 // 5 minutes
    const elapsed = Date.now() - activeIndexing.startTime

    if (elapsed >= timeoutMs) {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
      return
    }

    // Set up timeout for remaining time
    const remainingTime = timeoutMs - elapsed
    const timeoutId = setTimeout(() => {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
    }, remainingTime)

    return () => clearTimeout(timeoutId)
  }, [activeIndexing])

  // De-indexing mutation for individual files
  const deindexMutation = useMutation({
    mutationFn: deindexFileAPI,
    onMutate: async (file: FileItem) => {
      // Optimistically update file to "not-indexed" status
      updateFileIndexingStatus(
        queryClient,
        file.resource_id,
        "not-indexed",
        undefined,
        undefined, // Clear the KB ID
      )

      toast.info(`Removing "${file.inode_path.path}" from knowledge base...`)
      return { file }
    },
    onSuccess: (data) => {
      const { file } = data
      toast.success(`Removed "${file.inode_path.path}" from knowledge base`)

      // File status should already be "not-indexed" from optimistic update
      // No need to update again
    },
    onError: (error, file) => {
      // Rollback optimistic update - restore the indexed status
      updateFileIndexingStatus(
        queryClient,
        file.resource_id,
        "indexed",
        undefined,
        file.kbResourceId, // Restore the KB ID
      )

      toast.error(
        `Failed to remove "${file.inode_path.path}" from knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  // Batch de-indexing mutation for multiple files
  const batchDeindexMutation = useMutation({
    mutationFn: batchDeindexFilesAPI,
    onMutate: async (selectedItems: FileItem[]) => {
      const indexedFiles = selectedItems.filter(
        (item) => item.indexingStatus === "indexed" && item.kbResourceId,
      )

      if (indexedFiles.length === 0) {
        toast.error("No indexed files found in selection")
        throw new Error("No indexed files to de-index")
      }

      // Optimistically update all indexed files to "not-indexed" status
      indexedFiles.forEach((item) => {
        updateFileIndexingStatus(
          queryClient,
          item.resource_id,
          "not-indexed",
          undefined,
          undefined, // Clear the KB ID
        )
      })

      toast.info(
        `Removing ${indexedFiles.length} file${indexedFiles.length !== 1 ? "s" : ""} from knowledge base...`,
      )
      return { indexedFiles }
    },
    onSuccess: (data) => {
      const { selectedItems } = data
      toast.success(
        `Removed ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} from knowledge base`,
      )
    },
    onError: (error, _, context) => {
      // Rollback optimistic updates - restore indexed status for all files
      if (context?.indexedFiles) {
        context.indexedFiles.forEach((item: FileItem) => {
          updateFileIndexingStatus(
            queryClient,
            item.resource_id,
            "indexed",
            undefined,
            item.kbResourceId, // Restore the KB ID
          )
        })
      }

      toast.error(
        `Failed to remove files from knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  const isIndexing = mutation.isPending || batchDeindexMutation.isPending
  const isPolling = isPollingQuery && !!activeIndexing
  const isActive = isIndexing || isPolling

  // Cancel function to stop monitoring and reset state
  const cancelIndexing = useCallback(() => {
    if (activeIndexing) {
      // Rollback optimistic updates - reset files to previous states
      activeIndexing.selectedFiles.forEach((file) => {
        updateFileIndexingStatus(
          queryClient,
          file.resource_id,
          "not-indexed", // Reset to not-indexed since we can't know actual state
          undefined,
          undefined, // Clear KB ID
        )
      })

      // Reset the active indexing state (this stops polling)
      setActiveIndexing(null)

      toast.info(
        "Stopped monitoring indexing. Operations may continue in background.",
      )
    }
  }, [activeIndexing, queryClient])

  return {
    indexFiles: mutation.mutate,
    deindexFile: deindexMutation.mutate,
    batchDeindexFiles: batchDeindexMutation.mutate,
    cancelIndexing,
    isIndexing,
    isPolling,
    isActive,
    activeIndexing, // Expose for cancel button visibility
  }
}
