"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  triggerKnowledgeBaseSync,
  generateKnowledgeBaseName,
  getKnowledgeBaseStatus,
} from "@/lib/api/knowledge-base"
import { updateFileIndexingStatus } from "@/lib/cache-utils"
import type { FileItem, KBResource } from "@/lib/types"

interface UseFileIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  isIndexing: boolean
  isPolling: boolean
  isActive: boolean
}

// Map KB resource status to our IndexingStatus
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

// Extracted API function for the mutation
async function indexFilesAPI(selectedItems: FileItem[]) {
  // Get connection info from the files API
  const filesResponse = await fetch("/api/files")
  if (!filesResponse.ok) {
    throw new Error("Failed to get connection information")
  }
  const filesData = await filesResponse.json()
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
  } | null>(null)

  // Knowledge Base creation mutation
  const mutation = useMutation({
    mutationFn: indexFilesAPI,
    onMutate: async (selectedItems: FileItem[]) => {
      if (selectedItems.length === 0) {
        toast.error("No files selected for indexing")
        throw new Error("No files selected")
      }

      // Optimistically update all selected files to "pending" status
      selectedItems.forEach((item) => {
        console.log(
          `[DEBUG] Setting file ${item.resource_id} to "pending" (optimistic)`,
        )
        updateFileIndexingStatus(queryClient, item.resource_id, "pending")
      })

      toast.success("Starting indexing process...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { kb, selectedItems, kbName } = data

      console.log(
        `[DEBUG] KB created successfully: ${kb.knowledge_base_id}, starting status polling`,
      )

      // Immediately set files to "indexing" status since KB creation succeeded
      selectedItems.forEach((item) => {
        console.log(
          `[DEBUG] Setting file ${item.resource_id} to "indexing" (KB created)`,
        )
        updateFileIndexingStatus(queryClient, item.resource_id, "indexing")
      })

      // Start status polling
      setActiveIndexing({
        knowledgeBaseId: kb.knowledge_base_id,
        selectedFiles: selectedItems,
      })

      toast.success(
        `Successfully started indexing ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} into "${kbName}"`,
      )
    },
    onError: (error, selectedItems) => {
      console.error("Failed to index files:", error)

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

  // Status polling query (consolidated from useIndexingStatus)
  const {
    data: kbStatusData,
    isLoading: isPollingQuery,
    error: pollingError,
  } = useQuery({
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
    refetchInterval: 1000, // Poll every 1 second to catch brief "indexing" status
    refetchIntervalInBackground: true,
    retry: 2,
  })

  if (pollingError) {
    console.error("Status polling query error:", pollingError)
  }

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
        console.log(
          `[DEBUG] File ${file.resource_id}: API status "${kbResource.status}" -> UI status "${indexingStatus}"`,
        )
        updateFileIndexingStatus(queryClient, file.resource_id, indexingStatus)
      } else {
        console.log(
          `[DEBUG] File ${file.resource_id}: No status found in KB response`,
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

  // Stop polling when all files are completed
  useEffect(() => {
    if (allFilesCompleted && activeIndexing) {
      setActiveIndexing(null)
      toast.success("Indexing completed!")
    }
  }, [allFilesCompleted, activeIndexing])

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
