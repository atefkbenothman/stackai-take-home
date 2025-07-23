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
}

export function FileTree({ files }: FileTreeProps) {
  return (
    <div className="border bg-white">
      <div className="border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">Files</h2>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {files.map((file) => (
          <FileTreeItem key={file.resource_id} item={file} level={0}>
            {/* Placeholder for future nested files */}
          </FileTreeItem>
        ))}
      </div>
    </div>
  )
}
