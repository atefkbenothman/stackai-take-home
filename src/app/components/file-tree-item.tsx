"use client"

import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"

interface FileTreeItemProps {
  item: {
    resource_id: string
    inode_type: "directory" | "file"
    inode_path: {
      path: string
    }
  }
  level?: number
  isExpanded?: boolean
  folderData?: {
    data?: any
    isLoading?: boolean
    error?: any
  }
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

  return (
    <div>
      <div
        className="flex cursor-pointer items-center px-2 py-1 hover:bg-gray-50"
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

      {isFolder && isExpanded && (
        <div>
          {folderData?.isLoading && (
            <div
              className="py-1 text-sm text-gray-500"
              style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
            >
              Loading...
            </div>
          )}

          {folderData?.error && (
            <div
              className="py-1 text-sm text-red-500"
              style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
            >
              Error loading folder
            </div>
          )}

          {folderData?.data?.files && (
            <div>
              {folderData.data.files.map((childFile: any) => (
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
