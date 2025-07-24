"use client"

import { FileTreeItem } from "@/components/file-tree/file-tree-item"
import { FileTreeFooter } from "@/components/file-tree/file-tree-footer"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"
import type { FileItem } from "@/lib/types"

interface FileTreeProps {
  files: FileItem[]
}

export function FileTree({ files }: FileTreeProps) {
  return (
    <div className="rounded border bg-white shadow-sm">
      <FileTreeHeader />
      <div className="h-[500px] overflow-y-auto">
        {files.map((file) => (
          <FileTreeItem key={file.resource_id} item={file} level={0} />
        ))}
      </div>
      <FileTreeFooter allFiles={files} />
    </div>
  )
}
