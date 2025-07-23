"use client"

import { useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { useFile } from "@/hooks/use-file"
import { FileTree } from "@/app/components/file-tree"
import type { FilesResponse, FolderQueryResult } from "@/lib/types"

export default function Files() {
  const { data: rootData, error } = useFile()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const handleFolderToggle = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const expandedFolderIds = Array.from(expandedFolders)

  const folderQueries = useQueries({
    queries: expandedFolderIds.map((folderId) => ({
      queryKey: ["files", folderId],
      queryFn: async (): Promise<FilesResponse> => {
        const url = `/api/files?folderId=${folderId}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("Failed to fetch files")
        }
        return response.json()
      },
    })),
  })

  // Create a map of folder data for easy lookup
  const folderDataMap = new Map<string, FolderQueryResult>()
  folderQueries.forEach((query, index) => {
    const folderId = expandedFolderIds[index]
    folderDataMap.set(folderId, {
      data: query.data,
      isLoading: query.isLoading,
      error: query.error,
    })
  })

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="p-4">
      {rootData && (
        <FileTree
          files={rootData.files}
          expandedFolders={expandedFolders}
          folderDataMap={folderDataMap}
          onFolderToggle={handleFolderToggle}
        />
      )}
    </div>
  )
}
