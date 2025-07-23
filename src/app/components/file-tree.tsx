"use client"

import { FileTreeItem } from "@/app/components/file-tree-item"
import type { FileItem } from "@/lib/types"

interface FileTreeProps {
  files: FileItem[]
}

export function FileTree({ files }: FileTreeProps) {
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
          />
        ))}
      </div>
    </div>
  )
}
