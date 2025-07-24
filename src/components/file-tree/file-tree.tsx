"use client"

import { FileTreeItem } from "@/components/file-tree/file-tree-item"
import { SelectionSummary } from "@/components/file-tree/selection-summary"
import type { FileItem } from "@/lib/types"

interface FileTreeProps {
  files: FileItem[]
}

export function FileTree({ files }: FileTreeProps) {
  return (
    <div className="rounded border bg-white">
      <div className="flex h-10 items-center border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">File Picker</h2>
      </div>
      <div className="my-2 max-h-96 overflow-y-auto">
        {files.map((file) => (
          <FileTreeItem key={file.resource_id} item={file} level={0} />
        ))}
      </div>
      <SelectionSummary allFiles={files} />
    </div>
  )
}
