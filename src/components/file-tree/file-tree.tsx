"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FileTreeItem } from "@/components/file-tree/file-tree-item"
import { FileTreeFooter } from "@/components/file-tree/file-tree-footer"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"
import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"
import { FileTreeError } from "@/components/file-tree/file-tree-error"
import { fetchFiles } from "@/lib/stack-ai-client"
import {
  sortFiles,
  searchCachedFiles,
  filterByExtension,
  type SortOption,
} from "@/lib/utils"

export function FileTree() {
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filterExtension, setFilterExtension] = useState("all")

  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSortChange = useCallback((newSortBy: SortOption) => {
    setSortBy(newSortBy)
  }, [])

  const handleSearchChange = useCallback((newSearchQuery: string) => {
    setSearchQuery(newSearchQuery)
  }, [])

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilterExtension(newFilter)
  }, [])

  const {
    data: filesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["files"],
    queryFn: () => fetchFiles(),
    staleTime: 5 * 60 * 1000,
  })

  const displayFiles = useMemo(() => {
    if (debouncedSearch.trim()) {
      const searchResults = searchCachedFiles(
        queryClient,
        debouncedSearch,
        sortBy,
      )
      return filterByExtension(searchResults, filterExtension)
    } else {
      if (!filesData?.files) return []
      const filteredFiles = filterByExtension(filesData.files, filterExtension)
      return sortFiles(filteredFiles, sortBy)
    }
  }, [filesData?.files, sortBy, debouncedSearch, filterExtension, queryClient])

  const stableAllFiles = useMemo(() => {
    return filesData?.files || []
  }, [filesData?.files])

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
      <FileTreeFooter allFiles={stableAllFiles} />
    </div>
  )
}
