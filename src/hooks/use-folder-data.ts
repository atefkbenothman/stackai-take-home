import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { FilesResponse } from "@/lib/types"
import { getFiles } from "@/lib/api/files"

interface UseFolderDataReturn {
  fetchFolder: (folderId: string) => Promise<FilesResponse>
  prefetchFolder: (folderId: string) => Promise<void>
  getCachedFolder: (folderId: string) => FilesResponse | null
}

/**
 * Single source of truth for folder data fetching and caching.
 * Provides consistent query configuration across all folder operations.
 */
export function useFolderData(): UseFolderDataReturn {
  const queryClient = useQueryClient()

  const getQueryConfig = useCallback(
    (folderId: string) => ({
      queryKey: ["files", folderId],
      queryFn: () => getFiles(folderId),
      staleTime: 5 * 60 * 1000,
    }),
    [],
  )

  // Fetch folder data and update cache (used by expansion)
  const fetchFolder = useCallback(
    async (folderId: string): Promise<FilesResponse> => {
      const config = getQueryConfig(folderId)
      return await queryClient.fetchQuery(config)
    },
    [queryClient, getQueryConfig],
  )

  // Prefetch folder data without blocking (used by hover prefetch)
  const prefetchFolder = useCallback(
    async (folderId: string): Promise<void> => {
      const config = getQueryConfig(folderId)
      await queryClient.prefetchQuery(config)
    },
    [queryClient, getQueryConfig],
  )

  // Get cached folder data if available (used for quick cache checks)
  const getCachedFolder = useCallback(
    (folderId: string): FilesResponse | null => {
      return (
        queryClient.getQueryData<FilesResponse>(["files", folderId]) || null
      )
    },
    [queryClient],
  )

  return {
    fetchFolder,
    prefetchFolder,
    getCachedFolder,
  }
}
