"use client"

import { FileTreeItem } from "@/app/components/file-tree-item"

interface FileTreeProps {
  files: Array<{
    resource_id: string
    inode_type: "directory" | "file"
    inode_path: {
      path: string
    }
  }>
  expandedFolders: Set<string>
  folderDataMap: Map<string, any>
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
