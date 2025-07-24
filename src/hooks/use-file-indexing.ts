"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { generateKnowledgeBaseName } from "@/lib/utils"
import {
  updateFileIndexingStatus,
  mapKBStatusToIndexingStatus,
} from "@/lib/cache-utils"
import {
  createKnowledgeBase,
  triggerKnowledgeBaseSync,
  getKnowledgeBaseStatus,
  fetchFiles,
} from "@/lib/api-client"
import type { FileItem, KBResource } from "@/lib/types"

interface UseFileIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  isIndexing: boolean
  isPolling: boolean
  isActive: boolean
}

async function indexFilesAPI(selectedItems: FileItem[]) {
  // Get connection info from the files API
  const filesData = await fetchFiles()
  const connectionId = filesData.connection_id

  if (!connectionId) {
    throw new Error("Could not determine connection ID")
  }

  // Extract resource IDs and names for KB creation
  const selectedResourceIds = selectedItems.map((item) => item.resource_id)
  const selectedFileNames = selectedItems.map((item) => {
    const pathParts = item.inode_path.path.split("/")
    return pathParts[pathParts.length - 1] || item.inode_path.path
  })

  // Generate KB name and description
  const kbName = generateKnowledgeBaseName(selectedFileNames)
  const kbDescription = `Knowledge Base created from ${selectedItems.length} selected file${selectedItems.length !== 1 ? "s" : ""}: ${selectedFileNames.slice(0, 3).join(", ")}${selectedFileNames.length > 3 ? ` and ${selectedFileNames.length - 3} more` : ""}`

  // Create the Knowledge Base
  const kb = await createKnowledgeBase(
    connectionId,
    selectedResourceIds,
    kbName,
    kbDescription,
  )

  // Trigger sync/indexing
  await triggerKnowledgeBaseSync(kb.knowledge_base_id)

  return { kb, selectedItems, kbName }
}

export function useFileIndexing(): UseFileIndexingReturn {
  const queryClient = useQueryClient()
  const [activeIndexing, setActiveIndexing] = useState<{
    knowledgeBaseId: string
    selectedFiles: FileItem[]
    startTime: number
  } | null>(null)

  // Knowledge Base creation mutation
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

      toast.success("Starting indexing process...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { kb, selectedItems, kbName } = data

      // Immediately set files to "indexing" status since KB creation succeeded
      selectedItems.forEach((item) => {
        updateFileIndexingStatus(queryClient, item.resource_id, "indexing")
      })

      // Start status polling
      setActiveIndexing({
        knowledgeBaseId: kb.knowledge_base_id,
        selectedFiles: selectedItems,
        startTime: Date.now(),
      })

      toast.success(
        `Successfully started indexing ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} into "${kbName}"`,
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
        updateFileIndexingStatus(queryClient, file.resource_id, indexingStatus)
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

  const isIndexing = mutation.isPending
  const isPolling = isPollingQuery && !!activeIndexing
  const isActive = isIndexing || isPolling

  return {
    indexFiles: mutation.mutate,
    isIndexing,
    isPolling,
    isActive,
  }
}
