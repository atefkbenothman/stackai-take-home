"use client"

import { FileTreeItemSkeleton } from "@/components/file-tree/file-tree-item-skeleton"
import { FileTreeFooter } from "@/components/file-tree/file-tree-footer"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"

export function FileTreeSkeleton() {
  return (
    <div className="rounded border bg-white shadow-sm">
      <FileTreeHeader
        sortBy="name"
        searchQuery=""
        filterExtension="all"
        onSearchChange={() => {}}
        onSortChange={() => {}}
        onFilterChange={() => {}}
      />
      <div className="h-[500px] w-full overflow-y-auto">
        {Array.from({ length: 13 }).map((_, index) => (
          <div className="border-b" key={index}>
            <div className="-mx-10 flex items-center">
              <FileTreeItemSkeleton level={0} index={index} />
            </div>
          </div>
        ))}
      </div>
      <FileTreeFooter allFiles={[]} />
    </div>
  )
}
