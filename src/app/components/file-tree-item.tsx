"use client"

import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useDebouncedCallback } from "use-debounce"
import type { FileItem } from "@/lib/types"
import { FileSkeleton } from "@/app/components/file-skeleton"
import { useFile } from "@/hooks/use-file"
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

  const folderQuery = useFile(
    isExpanded && isFolder ? item.resource_id : undefined,
  )

  // Prefetch folder contents
  const prefetchFolder = async (folderId: string) => {
    // Skip if already prefetched or expanded
    if (prefetchedFolders.current.has(folderId) || isExpanded) return
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

  const debouncedPrefetch = useDebouncedCallback(prefetchFolder, 100)

  const handleToggle = () => {
    if (!isFolder) return
    setIsExpanded(!isExpanded)
  }

  const handleMouseEnter = () => {
    if (isFolder && !isExpanded) {
      debouncedPrefetch(item.resource_id)
    }
  }

  // Show toast notification for errors
  useEffect(() => {
    if (folderQuery?.error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`, {
        action: {
          label: "Retry",
          onClick: () => handleToggle(),
        },
      })
    }
  }, [folderQuery?.error, item.inode_path.path])

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
          {folderQuery?.isLoading && <FileSkeleton level={level + 1} />}
          {!folderQuery?.isLoading &&
            !folderQuery?.error &&
            folderQuery?.data?.files && (
              <div>
                {folderQuery.data.files.map((childFile: FileItem) => (
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
