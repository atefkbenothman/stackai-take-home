"use client"

import { useState } from "react"
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
  children?: React.ReactNode
}

export function FileTreeItem({ item, level = 0, children }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isFolder = item.inode_type === "directory"

  const handleToggle = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <div
        className="flex cursor-pointer items-center px-2 py-1 hover:bg-gray-100"
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

      {isFolder && isExpanded && children && <div>{children}</div>}
    </div>
  )
}
