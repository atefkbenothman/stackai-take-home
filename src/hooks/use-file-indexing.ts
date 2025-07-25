"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  fetchFiles,
  triggerKnowledgeBaseSync,
  getKnowledgeBaseStatus,
  deleteFromKnowledgeBase,
} from "@/lib/stack-ai-client"
import type {
  FileItem,
  KBResource,
  FilesResponse,
  IndexingStatus,
} from "@/lib/types"
import type { QueryClient, Query } from "@tanstack/react-query"

/**
 * Map KB resource status to our IndexingStatus
 */
function mapKBStatusToIndexingStatus(
  kbStatus?: string,
): "pending" | "indexing" | "indexed" | "error" {
  switch (kbStatus) {
    case "pending":
      return "indexing" // API "pending" means actively being processed = UI "indexing"
    case "indexed":
      return "indexed"
    case "error":
      return "error"
    default:
      return "indexing" // Default to indexing since we're polling an active KB
  }
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

  // Update any folder-specific caches that might contain this file
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
  isIndexing: boolean
  isPolling: boolean
  isActive: boolean
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

  // Check for any failures
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

      toast.info("Creating Knowledge Base and indexing files...")
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
        `Successfully created Knowledge Base and started indexing ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`,
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

  // Status polling query
  const { data: kbStatusData, isLoading: isPollingQuery } = useQuery({
    queryKey: ["kb-status", activeIndexing?.knowledgeBaseId],
    queryFn: async () => {
      if (!activeIndexing?.knowledgeBaseId) return null

      try {
        const result = await getKnowledgeBaseStatus(
          activeIndexing.knowledgeBaseId,
          "/",
        )
        return result
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

    // Create a map of resource_id to status for quick lookup
    const statusMap = new Map<string, KBResource>()
    kbStatusData.data.forEach((kbResource: KBResource) => {
      statusMap.set(kbResource.resource_id, kbResource)
    })

    // Update cache for each selected file based on KB status
    activeIndexing.selectedFiles.forEach((file) => {
      const kbResource = statusMap.get(file.resource_id)

      if (kbResource?.status) {
        const indexingStatus = mapKBStatusToIndexingStatus(kbResource.status)
        updateFileIndexingStatus(
          queryClient,
          file.resource_id,
          indexingStatus,
          undefined,
          activeIndexing.knowledgeBaseId,
        )
      }
    })
  }, [kbStatusData, activeIndexing, queryClient])

  // Check if all files have reached a final state (indexed or error)
  const allFilesCompleted = activeIndexing
    ? activeIndexing.selectedFiles.every((file) => {
        if (!kbStatusData?.data) return false

        const kbResource = kbStatusData.data.find(
          (kb: KBResource) => kb.resource_id === file.resource_id,
        )
        const isCompleted =
          kbResource?.status === "indexed" || kbResource?.status === "error"

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

      toast.info(`Removing "${file.inode_path.path}" from index...`)
      return { file }
    },
    onSuccess: (data) => {
      const { file } = data
      toast.success(`Successfully removed "${file.inode_path.path}" from index`)

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
        `Failed to remove "${file.inode_path.path}" from index: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        `Removing ${indexedFiles.length} file${indexedFiles.length !== 1 ? "s" : ""} from index...`,
      )
      return { indexedFiles }
    },
    onSuccess: (data) => {
      const { selectedItems } = data
      toast.success(
        `Successfully removed ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} from index`,
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
        `Failed to remove files from index: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  const isIndexing = mutation.isPending || batchDeindexMutation.isPending
  const isPolling = isPollingQuery && !!activeIndexing
  const isActive = isIndexing || isPolling

  return {
    indexFiles: mutation.mutate,
    deindexFile: deindexMutation.mutate,
    batchDeindexFiles: batchDeindexMutation.mutate,
    isIndexing,
    isPolling,
    isActive,
  }
}
