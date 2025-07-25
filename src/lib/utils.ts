import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { QueryClient } from "@tanstack/react-query"
import type { FileItem, FilesResponse } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)

  if (isNaN(date.getTime())) return ""

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  })
}

/**
 * Gets all FileItems from React Query cache by searching all "files" query keys
 */
export function getAllCachedItems(queryClient: QueryClient): FileItem[] {
  const queryCache = queryClient.getQueryCache()
  const allItems: FileItem[] = []

  queryCache.findAll({ queryKey: ["files"] }).forEach((query) => {
    const data = query.state.data as FilesResponse | undefined
    if (data?.files) {
      allItems.push(...data.files)
    }
  })

  return allItems
}

/**
 * Checks if a given item is a descendant of the specified ancestor by walking the parentId chain
 */
export function isDescendantOf(
  childItem: FileItem,
  ancestorId: string,
  allItems: FileItem[]
): boolean {
  let currentItem = childItem
  const visited = new Set<string>()

  while (currentItem.parentId && !visited.has(currentItem.resource_id)) {
    visited.add(currentItem.resource_id)

    if (currentItem.parentId === ancestorId) {
      return true
    }

    const parentItem = allItems.find(
      (item) => item.resource_id === currentItem.parentId
    )

    if (!parentItem) {
      break
    }

    currentItem = parentItem
  }

  return false
}

/**
 * Gets all cached descendants of a folder (at any depth)
 */
export function getAllCachedDescendants(
  folderId: string,
  queryClient: QueryClient
): FileItem[] {
  const allItems = getAllCachedItems(queryClient)
  return allItems.filter((item) => isDescendantOf(item, folderId, allItems))
}
