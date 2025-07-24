import type { QueryClient, Query } from "@tanstack/react-query"
import type { FileItem, FilesResponse, IndexingStatus } from "@/lib/types"

/**
 * Shared utility to update file indexing status in TanStack Query cache
 * This updates all relevant file caches to maintain consistency
 */
export function updateFileIndexingStatus(
  queryClient: QueryClient,
  resourceId: string,
  status: IndexingStatus,
  error?: string,
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
              lastIndexedAt: status === "indexed" ? new Date().toISOString() : file.lastIndexedAt
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
                    lastIndexedAt: status === "indexed" ? new Date().toISOString() : file.lastIndexedAt
                  }
                : file,
            ),
          }
        },
      )
    }
  })
}