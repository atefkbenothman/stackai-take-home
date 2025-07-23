"use client"

import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef, useState } from "react"
import { useQueryClient, UseQueryResult } from "@tanstack/react-query"
import { useDebouncedCallback } from "use-debounce"
import type { FileItem, FilesResponse } from "@/lib/types"
import { FileSkeleton } from "@/app/components/file-skeleton"
import { useFile } from "@/hooks/use-file"
import { getFiles } from "@/lib/api/files"

interface FileTreeItemProps {
  item: FileItem
  level?: number
  isExpanded?: boolean
  folderData?: UseQueryResult<FilesResponse>
  onToggle?: () => void
}

export function FileTreeItem({
  item,
  level = 0,
  isExpanded = false,
  folderData,
  onToggle,
}: FileTreeItemProps) {
  const isFolder = item.inode_type === "directory"

  const queryClient = useQueryClient()
  const prefetchedFolders = useRef(new Set<string>())

  // Local expansion state for nested folders (when no parent management)
  const [localExpanded, setLocalExpanded] = useState(false)

  // Use parent-managed state if available, otherwise local state
  const isCurrentlyExpanded = onToggle ? isExpanded : localExpanded

  // Use useFile hook for nested folders (when no parent management)
  const localFileQuery = useFile(
    !onToggle && isCurrentlyExpanded && isFolder ? item.resource_id : undefined,
  )

  // Use parent-provided data or local query data
  const currentFolderData = onToggle ? folderData : localFileQuery

  // Prefetch folder contents
  const prefetchFolder = async (folderId: string) => {
    // Skip if already prefetched or expanded
    if (prefetchedFolders.current.has(folderId) || isCurrentlyExpanded) return

    try {
      await queryClient.prefetchQuery({
        queryKey: ["files", folderId],
        queryFn: () => getFiles(folderId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })

      prefetchedFolders.current.add(folderId)
    } catch (error) {
      console.debug("Prefetch failed for folder:", folderId, error)
    }
  }

  // Debounced prefetch function (300ms delay)
  const debouncedPrefetch = useDebouncedCallback(prefetchFolder, 300)

  const handleToggle = () => {
    if (!isFolder) return
    if (onToggle) {
      // Parent-managed expansion
      onToggle()
    } else {
      // Local expansion management for nested folders
      setLocalExpanded(!localExpanded)
    }
  }

  const handleMouseEnter = () => {
    if (isFolder && !isCurrentlyExpanded) {
      debouncedPrefetch(item.resource_id)
    }
  }

  // Show toast notification for errors
  useEffect(() => {
    if (currentFolderData?.error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`, {
        action: {
          label: "Retry",
          onClick: () => handleToggle(),
        },
      })
    }
  }, [currentFolderData?.error, item.inode_path.path])

  return (
    <div>
      <div
        className="flex cursor-pointer items-center px-2 py-1 transition-colors hover:bg-gray-50"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
      >
        <div className="mr-2 flex h-4 w-4 items-center justify-center text-gray-500">
          {isFolder ? (
            isCurrentlyExpanded ? (
              <Minus size={12} />
            ) : (
              <Plus size={12} />
            )
          ) : null}
        </div>

        <div className="mr-2 flex h-5 w-5 items-center justify-center text-gray-600">
          {isFolder ? (
            isCurrentlyExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <File size={16} />
          )}
        </div>

        <span className="truncate font-mono text-sm">
          {item.inode_path.path}
        </span>
      </div>

      {isFolder && isCurrentlyExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-150">
          {currentFolderData?.isLoading && <FileSkeleton level={level + 1} />}
          {!currentFolderData?.isLoading &&
            !currentFolderData?.error &&
            currentFolderData?.data?.files && (
              <div>
                {currentFolderData.data.files.map((childFile: FileItem) => (
                  <FileTreeItem
                    key={childFile.resource_id}
                    item={childFile}
                    level={level + 1}
                  />
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  )
}
