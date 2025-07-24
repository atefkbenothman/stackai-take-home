import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryClient, Query } from "@tanstack/react-query"
import { getKnowledgeBaseStatus } from "@/lib/api/knowledge-base"
import type { FileItem, KBResource, FilesResponse } from "@/lib/types"

interface UseIndexingStatusProps {
  knowledgeBaseId: string | null
  selectedFiles: FileItem[]
  isActive: boolean
}

interface UseIndexingStatusReturn {
  isPolling: boolean
  allFilesCompleted: boolean
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
      files: oldData.files.map((file: FileItem) =>
        file.resource_id === resourceId
          ? { ...file, indexingStatus: status, indexingError: error }
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
                ? { ...file, indexingStatus: status, indexingError: error }
                : file,
            ),
          }
        },
      )
    }
  })
}

// Map KB resource status to our IndexingStatus
function mapKBStatusToIndexingStatus(
  kbStatus?: string,
): "pending" | "indexing" | "indexed" | "error" {
  switch (kbStatus) {
    case "pending":
      return "pending"
    case "indexing":
      return "indexing"
    case "indexed":
      return "indexed"
    case "error":
      return "error"
    default:
      return "pending"
  }
}

export function useIndexingStatus({
  knowledgeBaseId,
  selectedFiles,
  isActive,
}: UseIndexingStatusProps): UseIndexingStatusReturn {
  const queryClient = useQueryClient()

  const {
    data: kbStatusData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kb-status", knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId) return null

      try {
        const result = await getKnowledgeBaseStatus(knowledgeBaseId, "/")
        return result
      } catch (err) {
        throw err
      }
    },
    enabled: isActive && !!knowledgeBaseId,
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true, // Continue polling in background
    retry: 2,
  })

  if (error) {
    console.error("Status polling query error:", error)
  }

  useEffect(() => {
    if (!kbStatusData?.data) {
      return
    }

    // Create a map of resource_id to status for quick lookup
    const statusMap = new Map<string, KBResource>()
    kbStatusData.data.forEach((kbResource: KBResource) => {
      statusMap.set(kbResource.resource_id, kbResource)
    })

    // Update cache for each selected file based on KB status
    selectedFiles.forEach((file) => {
      const kbResource = statusMap.get(file.resource_id)

      if (kbResource?.status) {
        const indexingStatus = mapKBStatusToIndexingStatus(kbResource.status)
        updateFileStatusInCache(queryClient, file.resource_id, indexingStatus)
      } else {
      }
    })
  }, [kbStatusData, selectedFiles, queryClient])

  // Check if all files have reached a final state (indexed or error)
  const allFilesCompleted = selectedFiles.every((file) => {
    if (!kbStatusData?.data) return false

    const kbResource = kbStatusData.data.find(
      (kb: KBResource) => kb.resource_id === file.resource_id,
    )
    const isCompleted =
      kbResource?.status === "indexed" || kbResource?.status === "error"

    return isCompleted
  })

  return {
    isPolling: isLoading && isActive,
    allFilesCompleted,
  }
}
