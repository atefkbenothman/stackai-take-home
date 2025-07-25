"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { fetchFiles } from "@/lib/stack-ai-api"
import type { FileItem, FilesResponse } from "@/lib/types"

const SEARCH_DEBOUNCE_DELAY = 300
const CACHE_STALE_TIME = 5 * 60 * 1000

export type SortOption = "name" | "date"

export function sortFiles(files: FileItem[], sortBy: SortOption): FileItem[] {
  return [...files].sort((a, b) => {
    if (sortBy === "name") {
      return a.inode_path.path.localeCompare(b.inode_path.path, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    } else {
      const dateA = new Date(a.modified_at).getTime()
      const dateB = new Date(b.modified_at).getTime()
      return dateB - dateA
    }
  })
}

export function filterByExtension(
  files: FileItem[],
  extension: string,
): FileItem[] {
  if (extension === "all") return files

  return files.filter((file) => {
    // Always show folders
    if (file.inode_type === "directory") return true

    const fileName = file.inode_path.path.toLowerCase()
    const fileExtension = fileName.split(".").pop()

    // Match exact extension (case-insensitive)
    return fileExtension === extension.toLowerCase()
  })
}

function getAllCachedFiles(queryClient: QueryClient): FileItem[] {
  const cache = queryClient.getQueryCache()
  const allFiles: FileItem[] = []

  // Get all cached queries that match our files pattern
  // Include both active and inactive queries (collapsed folders)
  const queries = cache.findAll({
    queryKey: ["files"],
  })

  queries.forEach((query) => {
    const data = query.state.data as FilesResponse
    if (data?.files) {
      allFiles.push(...data.files)
    }
  })

  return allFiles
}

function searchCachedFiles(
  queryClient: QueryClient,
  searchQuery: string,
  sortBy: SortOption,
) {
  if (!searchQuery.trim()) return []

  const allFiles = getAllCachedFiles(queryClient)
  const query = searchQuery.toLowerCase()

  const matchingFiles = allFiles.filter((file) =>
    file.inode_path.path.toLowerCase().includes(query),
  )

  return sortFiles(matchingFiles, sortBy)
}

export function useFileTreeData() {
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filterExtension, setFilterExtension] = useState("all")

  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, SEARCH_DEBOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data: filesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["files"],
    queryFn: () => fetchFiles(),
    staleTime: CACHE_STALE_TIME,
  })

  // Process and filter files
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

  const handleSortChange = useCallback((newSortBy: SortOption) => {
    setSortBy(newSortBy)
  }, [])

  const handleSearchChange = useCallback((newSearchQuery: string) => {
    setSearchQuery(newSearchQuery)
  }, [])

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilterExtension(newFilter)
  }, [])

  return {
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
  }
}
