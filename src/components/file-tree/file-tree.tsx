"use client"

import { useQuery } from "@tanstack/react-query"
import { FileTreeItem } from "@/components/file-tree/file-tree-item"
import { FileTreeFooter } from "@/components/file-tree/file-tree-footer"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"
import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"
import { FileTreeError } from "@/components/file-tree/file-tree-error"
import { getFiles } from "@/lib/api/files"

export function FileTree() {
  const {
    data: filesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["files"],
    queryFn: () => getFiles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return <FileTreeSkeleton />
  }

  if (error) {
    return <FileTreeError />
  }

  if (!filesData?.files) {
    return <FileTreeError />
  }

  return (
    <div className="rounded border bg-white shadow-sm">
      <FileTreeHeader />
      <div className="h-[500px] overflow-y-auto">
        {filesData.files.map((file) => (
          <FileTreeItem key={file.resource_id} item={file} level={0} />
        ))}
      </div>
      <FileTreeFooter allFiles={filesData.files} />
    </div>
  )
}
