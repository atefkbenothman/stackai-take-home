import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { QueryClient } from "@tanstack/react-query"
import type { FileItem, FilesResponse } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string): string {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)

    if (isNaN(date.getTime())) return ""

    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    })
  } catch {
    return ""
  }
}

export type SortOption = "name" | "date"

export function sortFiles(files: FileItem[], sortBy: SortOption): FileItem[] {
  return [...files].sort((a, b) => {
    if (sortBy === "name") {
      return a.inode_path.path.localeCompare(b.inode_path.path, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    } else {
      // Sort by date - most recent first
      const dateA = new Date(a.modified_at).getTime()
      const dateB = new Date(b.modified_at).getTime()
      return dateB - dateA
    }
  })
}

export function getAllCachedFiles(queryClient: QueryClient): FileItem[] {
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

export function searchCachedFiles(
  queryClient: QueryClient,
  searchQuery: string,
  sortBy: SortOption,
): FileItem[] {
  if (!searchQuery.trim()) return []

  const allFiles = getAllCachedFiles(queryClient)
  const query = searchQuery.toLowerCase()

  const matchingFiles = allFiles.filter((file) =>
    file.inode_path.path.toLowerCase().includes(query),
  )

  // Apply sorting to search results
  return sortFiles(matchingFiles, sortBy)
}

export function getUniqueExtensions(files: FileItem[]): string[] {
  const extensions = new Set<string>()

  files.forEach((file) => {
    if (file.inode_type === "file") {
      const fileName = file.inode_path.path
      const lastDot = fileName.lastIndexOf(".")
      if (lastDot > 0) {
        // Must have extension and not start with dot
        extensions.add(fileName.slice(lastDot + 1).toLowerCase())
      }
    }
  })

  return Array.from(extensions).sort()
}

export function filterByExtension(
  files: FileItem[],
  extension: string,
): FileItem[] {
  if (extension === "all") return files

  return files.filter((file) => {
    // Always show folders so users can navigate
    if (file.inode_type === "directory") return true

    const fileName = file.inode_path.path.toLowerCase()
    const fileExtension = fileName.split(".").pop()

    // Match exact extension (case-insensitive)
    return fileExtension === extension.toLowerCase()
  })
}

/**
 * Helper to generate a Knowledge Base name from selected files
 */
export function generateKnowledgeBaseName(selectedFileNames: string[]): string {
  const timestamp = new Date().toISOString().split("T")[0]
  if (selectedFileNames.length === 1) {
    return `KB - ${selectedFileNames[0]} - ${timestamp}`
  } else if (selectedFileNames.length <= 3) {
    return `KB - ${selectedFileNames.join(", ")} - ${timestamp}`
  } else {
    return `KB - ${selectedFileNames.length} files - ${timestamp}`
  }
}
