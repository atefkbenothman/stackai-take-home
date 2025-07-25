import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { QueryClient } from "@tanstack/react-query"
import type {
  FileItem,
  FilesResponse,
  IndexingStatus,
  KBStatus,
  KBResource,
} from "@/lib/types"

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

export function mapKBStatusToIndexingStatus(
  kbStatus?: string,
  resourceId?: string,
): "pending" | "indexing" | "indexed" | "error" {
  switch (kbStatus) {
    case "pending":
      return "indexing"
    case "indexed":
      return "indexed"
    case "error":
      return "error"
    case undefined:
      if (resourceId === "STACK_VFS_VIRTUAL_DIRECTORY") {
        return "indexed"
      }
      return "indexing"
    default:
      return "indexing"
  }
}

export function getParentFolderPath(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf("/")
  if (lastSlashIndex === -1) {
    return "/"
  }
  return filePath.substring(0, lastSlashIndex)
}

/**
 * Aggregate child file statuses to determine overall folder status
 */
export function aggregateFolderStatus(childFiles: KBResource[]): KBStatus {
  const actualFiles = childFiles.filter(
    (f) =>
      f.inode_type === "file" &&
      f.resource_id !== "STACK_VFS_VIRTUAL_DIRECTORY",
  )

  if (actualFiles.length === 0) {
    return "indexed"
  }

  if (actualFiles.every((f) => f.status === "indexed")) {
    return "indexed"
  }

  if (actualFiles.some((f) => f.status === "error")) {
    return "error"
  }

  if (actualFiles.some((f) => f.status === "indexing")) {
    return "indexing"
  }

  return "pending"
}

export function updateFileIndexingStatus(
  queryClient: QueryClient,
  resourceId: string,
  status: IndexingStatus,
  error?: string,
  knowledgeBaseId?: string,
  file?: FileItem,
) {
  const targetQuery = file?.parentId ? ["files", file.parentId] : ["files"]

  queryClient.setQueryData(
    targetQuery,
    (oldData: FilesResponse | undefined) => {
      if (!oldData) return oldData

      return {
        ...oldData,
        files: oldData.files.map((file: FileItem) =>
          file.resource_id === resourceId
            ? {
                ...file,
                indexingStatus: status,
                indexingError: error,
                kbResourceId:
                  status === "indexed" && knowledgeBaseId
                    ? knowledgeBaseId
                    : status === "not-indexed"
                      ? undefined
                      : file.kbResourceId,
                lastIndexedAt:
                  status === "indexed"
                    ? new Date().toISOString()
                    : file.lastIndexedAt,
              }
            : file,
        ),
      }
    },
  )
}
