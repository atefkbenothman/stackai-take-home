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
  allItems: FileItem[],
): boolean {
  let currentItem = childItem
  const visited = new Set<string>()

  while (currentItem.parentId && !visited.has(currentItem.resource_id)) {
    visited.add(currentItem.resource_id)

    if (currentItem.parentId === ancestorId) {
      return true
    }

    const parentItem = allItems.find(
      (item) => item.resource_id === currentItem.parentId,
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
  queryClient: QueryClient,
): FileItem[] {
  const allItems = getAllCachedItems(queryClient)
  return allItems.filter((item) => isDescendantOf(item, folderId, allItems))
}

/**
 * Gets all direct children of a folder from cache
 */
export function getDirectChildren(
  folderId: string,
  queryClient: QueryClient,
): FileItem[] {
  const data = queryClient.getQueryData<FilesResponse>(["files", folderId])
  return data?.files || []
}

/**
 * Checks if a folder has any indexed children (direct children only)
 */
export function folderHasIndexedChildren(
  folderId: string,
  queryClient: QueryClient,
): boolean {
  const children = getDirectChildren(folderId, queryClient)
  return children.some(
    (child) =>
      child.indexingStatus === "indexed" ||
      child.indexingStatus === "indexing" ||
      child.indexingStatus === "pending",
  )
}

/**
 * Updates a folder's indexing status in cache
 */
export function updateFolderStatus(
  folderId: string,
  status: "indexed" | "not-indexed" | "indexing" | "pending",
  queryClient: QueryClient,
  kbResourceId?: string,
): void {
  // Find which query contains this folder
  const allItems = getAllCachedItems(queryClient)
  const folder = allItems.find((item) => item.resource_id === folderId)

  if (!folder) return

  const targetQuery = folder.parentId ? ["files", folder.parentId] : ["files"]

  queryClient.setQueryData(
    targetQuery,
    (oldData: FilesResponse | undefined) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        files: oldData.files.map((f) =>
          f.resource_id === folderId
            ? {
                ...f,
                indexingStatus: status,
                kbResourceId:
                  status === "not-indexed"
                    ? undefined
                    : kbResourceId || f.kbResourceId,
                lastIndexedAt:
                  status === "not-indexed"
                    ? undefined
                    : f.lastIndexedAt || new Date().toISOString(),
              }
            : f,
        ),
      }
    },
  )
}
