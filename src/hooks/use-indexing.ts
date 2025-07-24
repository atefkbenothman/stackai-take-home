import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type Query,
} from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  triggerKnowledgeBaseSync,
  generateKnowledgeBaseName,
} from "@/lib/api/knowledge-base"
import { useIndexingStatus } from "./use-indexing-status"
import type { FileItem, FilesResponse } from "@/lib/types"

interface UseIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  isIndexing: boolean
  isPolling: boolean
}

// Helper function to update file status in TanStack Query cache
function updateFileStatusInCache(
  queryClient: QueryClient,
  resourceId: string,
  status: "not-indexed" | "pending" | "indexing" | "indexed" | "error",
  error?: string,
) {
  // Update root files cache
  queryClient.setQueryData(["files"], (oldData: FilesResponse | undefined) => {
    if (!oldData) return oldData

    return {
      ...oldData,
      files: oldData.files.map((file) =>
        file.resource_id === resourceId
          ? { ...file, indexingStatus: status, indexingError: error }
          : file,
      ),
    }
  })

  // Update any folder-specific caches that might contain this file
  // This ensures consistency across all cached queries
  const queryCache = queryClient.getQueryCache()
  queryCache.getAll().forEach((query: Query) => {
    if (query.queryKey[0] === "files" && query.queryKey[1]) {
      queryClient.setQueryData(
        query.queryKey,
        (oldData: FilesResponse | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            files: oldData.files.map((file) =>
              file.resource_id === resourceId
                ? { ...file, indexingStatus: status, indexingError: error }
                : file,
            ),
          }
        },
      )
    }
  })
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

export function useIndexing(): UseIndexingReturn {
  const queryClient = useQueryClient()
  const [activeIndexing, setActiveIndexing] = useState<{
    knowledgeBaseId: string
    selectedFiles: FileItem[]
  } | null>(null)

  const mutation = useMutation({
    mutationFn: indexFilesAPI,
    onMutate: async (selectedItems: FileItem[]) => {
      if (selectedItems.length === 0) {
        toast.error("No files selected for indexing")
        throw new Error("No files selected")
      }

      // Optimistically update all selected files to "pending" status
      selectedItems.forEach((item) => {
        updateFileStatusInCache(queryClient, item.resource_id, "pending")
      })

      toast.success("Starting indexing process...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { kb, selectedItems, kbName } = data

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
        updateFileStatusInCache(
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

  // Use status polling hook
  const { isPolling, allFilesCompleted } = useIndexingStatus({
    knowledgeBaseId: activeIndexing?.knowledgeBaseId || null,
    selectedFiles: activeIndexing?.selectedFiles || [],
    isActive: !!activeIndexing,
  })

  // Stop polling when all files are completed
  useEffect(() => {
    if (allFilesCompleted && activeIndexing) {
      setActiveIndexing(null)
      toast.success("Indexing completed!")
    }
  }, [allFilesCompleted, activeIndexing])

  return {
    indexFiles: mutation.mutate,
    isIndexing: mutation.isPending,
    isPolling,
  }
}
