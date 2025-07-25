"use client"

import { FileTreeItem } from "@/components/file-tree/file-tree-item"
import { FileTreeFooter } from "@/components/file-tree/file-tree-footer"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"
import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"
import { FileTreeError } from "@/components/file-tree/file-tree-error"
import { useFileTreeData } from "@/hooks/use-file-tree-data"

export function FileTree() {
  const {
    displayFiles,
    filesData,
    isLoading,
    error,
    sortBy,
    searchQuery,
    debouncedSearch,
    filterExtension,
    handleSortChange,
    handleSearchChange,
    handleFilterChange,
  } = useFileTreeData()

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
      <FileTreeHeader
        sortBy={sortBy}
        searchQuery={searchQuery}
        filterExtension={filterExtension}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />
      <div className="h-[500px] overflow-y-auto">
        {displayFiles.length === 0 && searchQuery.trim() ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No files match your search
          </div>
        ) : (
          displayFiles.map((file) => (
            <FileTreeItem
              key={file.resource_id}
              item={file}
              level={debouncedSearch.trim() ? undefined : 0}
              sortBy={sortBy}
              filterExtension={filterExtension}
            />
          ))
        )}
      </div>
      <FileTreeFooter />
    </div>
  )
}
