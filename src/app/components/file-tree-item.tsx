"use client"

import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"
import type { FileItem, FolderQueryResult } from "@/lib/types"
import { FileSkeleton } from "./file-skeleton"

interface FileTreeItemProps {
  item: FileItem
  level?: number
  isExpanded?: boolean
  folderData?: FolderQueryResult
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

  const handleToggle = () => {
    if (isFolder && onToggle) {
      onToggle()
    }
  }

  // Show toast notification for errors
  useEffect(() => {
    if (folderData?.error) {
      toast.error(`Failed to load folder: ${item.inode_path.path}`, {
        action: {
          label: "Retry",
          onClick: () => onToggle?.(),
        },
      })
    }
  }, [folderData?.error, item.inode_path.path, onToggle])

  return (
    <div>
      <div
        className="flex cursor-pointer items-center px-2 py-1 transition-colors hover:bg-gray-50"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleToggle}
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

      {/* Render folder contents when expanded */}
      {isFolder && isExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-150">
          {folderData?.isLoading && <FileSkeleton level={level + 1} />}

          {!folderData?.isLoading &&
            !folderData?.error &&
            folderData?.data?.files && (
              <div>
                {folderData.data.files.map((childFile: FileItem) => (
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
