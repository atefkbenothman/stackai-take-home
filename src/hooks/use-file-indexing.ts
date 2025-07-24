"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  updateFileIndexingStatus,
  mapKBStatusToIndexingStatus,
} from "@/lib/cache-utils"
import {
  createKnowledgeBase,
  fetchFiles,
  triggerKnowledgeBaseSync,
  getKnowledgeBaseStatus,
  deleteFromKnowledgeBase,
} from "@/lib/stack-ai-client"
import type { FileItem, KBResource } from "@/lib/types"

interface UseFileIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  deindexFile: (file: FileItem) => void
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
    "Knowledge Base created via file picker"
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

  const isIndexing = mutation.isPending
  const isPolling = isPollingQuery && !!activeIndexing
  const isActive = isIndexing || isPolling

  return {
    indexFiles: mutation.mutate,
    deindexFile: deindexMutation.mutate,
    isIndexing,
    isPolling,
    isActive,
  }
}
