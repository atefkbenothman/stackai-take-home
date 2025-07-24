import { useRef, useCallback } from "react"
import { useFolderData } from "@/hooks/use-folder-data"

interface UseFolderPrefetchOptions {
  folderId: string
  isFolder: boolean
  isExpanded: boolean
}

interface UseFolderPrefetchReturn {
  prefetchFolder: (targetFolderId: string) => Promise<void>
  handleMouseEnter: () => void
}

export function useFolderPrefetch({
  folderId,
  isFolder,
  isExpanded,
}: UseFolderPrefetchOptions): UseFolderPrefetchReturn {
  const { prefetchFolder: prefetchFolderData } = useFolderData()
  const prefetchedFolders = useRef(new Set<string>())

  const prefetchFolder = useCallback(
    async (targetFolderId: string) => {
      // Skip if already prefetched or expanded
      if (prefetchedFolders.current.has(targetFolderId)) {
        return
      }

      if (isExpanded) {
        return
      }

      try {
        await prefetchFolderData(targetFolderId)
        prefetchedFolders.current.add(targetFolderId)
      } catch (error) {
        console.debug("Prefetch failed for folder:", targetFolderId, error)
      }
    },
    [prefetchFolderData, isExpanded],
  )

  const handleMouseEnter = useCallback(() => {
    if (isFolder && !isExpanded) {
      prefetchFolder(folderId)
    }
  }, [isFolder, isExpanded, prefetchFolder, folderId])

  return {
    prefetchFolder,
    handleMouseEnter,
  }
}
