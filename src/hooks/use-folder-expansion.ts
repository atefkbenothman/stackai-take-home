import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type { FilesResponse } from "@/lib/types"
import { useFolderData } from "@/hooks/use-folder-data"

interface UseFolderExpansionOptions {
  folderId: string
  isFolder: boolean
  folderName: string
}

interface UseFolderExpansionReturn {
  isExpanded: boolean
  folderData: FilesResponse | null
  isLoading: boolean
  error: Error | null
  handleToggle: () => void
  retry: () => void
}

export function useFolderExpansion({
  folderId,
  isFolder,
  folderName,
}: UseFolderExpansionOptions): UseFolderExpansionReturn {
  const { fetchFolder, getCachedFolder } = useFolderData()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [folderData, setFolderData] = useState<FilesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch folder data with cache-first approach
  const fetchFolderData = useCallback(async (targetFolderId: string) => {
    // Check cache first
    const cachedData = getCachedFolder(targetFolderId)
    if (cachedData) {
      setFolderData(cachedData)
      setIsLoading(false)
      setError(null)
      return
    }

    // Fetch from server if not in cache
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchFolder(targetFolderId)
      setFolderData(data)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Unknown error occurred")
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [fetchFolder, getCachedFolder])

  const handleToggle = useCallback(() => {
    if (!isFolder) return
    
    const wasExpanded = isExpanded
    setIsExpanded(!isExpanded)

    if (!wasExpanded) {
      fetchFolderData(folderId)
    } else {
      // Clear data when collapsing to save memory
      setFolderData(null)
      setError(null)
    }
  }, [isFolder, isExpanded, fetchFolderData, folderId])

  const retry = useCallback(() => {
    if (isFolder && folderId) {
      fetchFolderData(folderId)
    }
  }, [isFolder, folderId, fetchFolderData])

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load folder: ${folderName}`, {
        action: {
          label: "Retry",
          onClick: retry,
        },
      })
    }
  }, [error, folderName, retry])

  return {
    isExpanded,
    folderData,
    isLoading,
    error,
    handleToggle,
    retry,
  }
}