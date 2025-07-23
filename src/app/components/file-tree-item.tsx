"use client"

import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { FileItem } from "@/lib/types"
import { FileSkeleton } from "@/app/components/file-skeleton"
import { getFiles } from "@/lib/api/files"

interface FileTreeItemProps {
  item: FileItem
  level?: number
}

export function FileTreeItem({ item, level = 0 }: FileTreeItemProps) {
  const isFolder = item.inode_type === "directory"
  const queryClient = useQueryClient()
  const prefetchedFolders = useRef(new Set<string>())

  const [isExpanded, setIsExpanded] = useState(false)
  const [folderData, setFolderData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  // Prefetch folder contents
  const prefetchFolder = async (folderId: string) => {
    // Skip if already prefetched or expanded
    if (prefetchedFolders.current.has(folderId)) {
      return
    }

    if (isExpanded) {
      return
    }

    try {
      await queryClient.prefetchQuery({
        queryKey: ["files", folderId],
        queryFn: () => getFiles(folderId),
        staleTime: 5 * 60 * 1000,
      })

      prefetchedFolders.current.add(folderId)
    } catch (error) {
      console.debug("Prefetch failed for folder:", folderId, error)
    }
  }


  // Fetch folder data with cache-first approach
  const fetchFolderData = async (folderId: string) => {
    // Check cache first
    const cachedData = queryClient.getQueryData(["files", folderId])
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
      const data = await queryClient.fetchQuery({
        queryKey: ["files", folderId],
        queryFn: () => getFiles(folderId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
      setFolderData(data)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = () => {
    if (!isFolder) return
    const wasExpanded = isExpanded
    setIsExpanded(!isExpanded)

    if (!wasExpanded) {
      fetchFolderData(item.resource_id)
    } else {
      // Clear data when collapsing to save memory
      setFolderData(null)
      setError(null)
    }
  }

  const handleMouseEnter = () => {
    if (isFolder && !isExpanded) {
      prefetchFolder(item.resource_id)
    }
  }

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`, {
        action: {
          label: "Retry",
          onClick: () => fetchFolderData(item.resource_id),
        },
      })
    }
  }, [error, item.inode_path.path, item.resource_id])

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
            isExpanded ? (
              <Minus size={12} />
            ) : (
              <Plus size={12} />
            )
          ) : null}
        </div>

        <div className="mr-2 flex h-5 w-5 items-center justify-center text-gray-600">
          {isFolder ? (
            isExpanded ? (
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

      {isFolder && isExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-150">
          {isLoading && <FileSkeleton level={level + 1} />}
          {!isLoading && !error && folderData?.files && (
            <div>
              {folderData.files.map((childFile: FileItem) => (
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
