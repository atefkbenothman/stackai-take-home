"use client"

import { useState, useEffect } from "react"
import { useQueries, UseQueryResult } from "@tanstack/react-query"
import { toast } from "sonner"
import { useFile } from "@/hooks/use-file"
import { FileTree } from "@/app/components/file-tree"
import { getFiles } from "@/lib/api/files"
import type { FilesResponse } from "@/lib/types"

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
      queryFn: () => getFiles(folderId),
    })),
  })

  // Create a map of folder data for easy lookup
  const folderDataMap = new Map<string, UseQueryResult<FilesResponse>>()
  folderQueries.forEach((query, index) => {
    const folderId = expandedFolderIds[index]
    folderDataMap.set(folderId, query)
  })

  // Rollback expansion on persistent errors (after retry attempts)
  useEffect(() => {
    folderQueries.forEach((query, index) => {
      const folderId = expandedFolderIds[index]
      if (query.error && query.failureCount > 1) {
        // Rollback expansion after failed retries
        setExpandedFolders((prev) => {
          const newSet = new Set(prev)
          newSet.delete(folderId)
          return newSet
        })

        toast.error("Folder expansion failed", {
          description: "The folder has been collapsed due to loading errors.",
        })
      }
    })
  }, [folderQueries, expandedFolderIds])

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
