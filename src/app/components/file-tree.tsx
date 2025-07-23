"use client"

import { FileTreeItem } from "@/app/components/file-tree-item"
import type { FileItem, FolderQueryResult } from "@/lib/types"

interface FileTreeProps {
  files: FileItem[]
  expandedFolders: Set<string>
  folderDataMap: Map<string, FolderQueryResult>
  onFolderToggle: (folderId: string) => void
}

export function FileTree({
  files,
  expandedFolders,
  folderDataMap,
  onFolderToggle,
}: FileTreeProps) {
  return (
    <div className="border bg-white">
      <div className="border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">Files</h2>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {files.map((file) => (
          <FileTreeItem
            key={file.resource_id}
            item={file}
            level={0}
            isExpanded={expandedFolders.has(file.resource_id)}
            folderData={folderDataMap.get(file.resource_id)}
            onToggle={() => onFolderToggle(file.resource_id)}
          />
        ))}
      </div>
    </div>
  )
}
