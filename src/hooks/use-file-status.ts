"use client"

import { useMemo, useEffect, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getKnowledgeBaseStatus } from "@/lib/stack-ai-api"
import type {
  KBResource,
  ActiveIndexing,
  UseFileStatusReturn,
  FilesResponse,
  FileItem,
} from "@/lib/types"
import { getAllCachedDescendants } from "@/lib/utils"

export function useFileStatus(
  activeIndexing: ActiveIndexing | null,
): UseFileStatusReturn {
  const queryClient = useQueryClient()

  // Recursive status update function
  const updateFileAndDescendantsStatus = useCallback((
    file: FileItem,
    status: "indexed" | "error" | "indexing",
    knowledgeBaseId: string
  ) => {
    // Update the file itself
    const targetQuery = file.parentId ? ["files", file.parentId] : ["files"]
    queryClient.setQueryData(
      targetQuery,
      (oldData: FilesResponse | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          files: oldData.files.map((f) =>
            f.resource_id === file.resource_id
              ? {
                  ...f,
                  indexingStatus: status,
                  kbResourceId: knowledgeBaseId,
                  lastIndexedAt: new Date().toISOString(),
                }
              : f,
          ),
        }
      },
    )

    // If it's a folder, also update all its cached descendants
    if (file.inode_type === "directory") {
      const descendants = getAllCachedDescendants(file.resource_id, queryClient)
      descendants.forEach((descendant) => {
        const descendantQuery = descendant.parentId 
          ? ["files", descendant.parentId] 
          : ["files"]
        queryClient.setQueryData(
          descendantQuery,
          (oldData: FilesResponse | undefined) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              files: oldData.files.map((f) =>
                f.resource_id === descendant.resource_id
                  ? {
                      ...f,
                      indexingStatus: status,
                      kbResourceId: knowledgeBaseId,
                      lastIndexedAt: new Date().toISOString(),
                    }
                  : f,
              ),
            }
          },
        )
      })
    }
  }, [queryClient])

  const mapKBStatus = (status?: string): "indexed" | "error" | "indexing" => {
    return status === "indexed"
      ? "indexed"
      : status === "error"
        ? "error"
        : "indexing"
  }

  const createExistingFilesMap = (files: FileItem[]): Map<string, FileItem> => {
    return new Map(files.map((f) => [f.resource_id, f]))
  }

  const getParentPath = (filePath: string): string => {
    return filePath.substring(0, filePath.lastIndexOf("/")) || "/"
  }

  const separateFilesByType = (files: FileItem[]) => ({
    files: files.filter((f) => f.inode_type === "file"),
    folders: files.filter((f) => f.inode_type === "directory"),
  })

  const findKBResourceByPath = (
    resources: KBResource[],
    filePath: string,
  ): KBResource | undefined => {
    return resources.find((r) => r.inode_path.path === filePath)
  }

  const getUniqueParentPaths = (files: FileItem[]): Set<string> => {
    const parentPaths = new Set<string>()
    files.forEach((file) => {
      parentPaths.add(getParentPath(file.inode_path.path))
    })
    return parentPaths
  }

  // Process KB resource into FileItem (update existing or create new)
  const processKBResource = (
    kbResource: KBResource,
    existingFiles: Map<string, FileItem>,
    folder: FileItem,
    knowledgeBaseId: string,
  ): FileItem => {
    const existing = existingFiles.get(kbResource.resource_id)

    if (existing) {
      // Update existing file with new status
      return {
        ...existing,
        indexingStatus: mapKBStatus(kbResource.status),
        kbResourceId: knowledgeBaseId,
        lastIndexedAt: kbResource.created_at,
      }
    }

    // Create new file item
    return {
      resource_id: kbResource.resource_id,
      inode_type: kbResource.inode_type as "file" | "directory",
      inode_path: kbResource.inode_path,
      created_at: kbResource.created_at || "",
      modified_at: kbResource.updated_at || "",
      parentId: folder.resource_id,
      indexingStatus: mapKBStatus(kbResource.status),
      kbResourceId: knowledgeBaseId,
      lastIndexedAt: kbResource.created_at,
    }
  }

  // Update folder cache with children
  const updateFolderCache = (
    folder: FileItem,
    folderContents: KBResource[],
    knowledgeBaseId: string,
  ) => {
    queryClient.setQueryData(
      ["files", folder.resource_id],
      (oldData: FilesResponse | undefined) => {
        if (!oldData) return oldData

        const existingFiles = createExistingFilesMap(oldData.files)

        // Process KB resources into updated file items
        const updatedFiles = folderContents
          .filter((r) => r.resource_id !== "STACK_VFS_VIRTUAL_DIRECTORY")
          .map((kbResource) =>
            processKBResource(
              kbResource,
              existingFiles,
              folder,
              knowledgeBaseId,
            ),
          )

        // Merge with existing files (keep non-updated files, add/update others)
        const updatedIds = new Set(updatedFiles.map((item) => item.resource_id))
        const preservedFiles = oldData.files.filter(
          (file) => !updatedIds.has(file.resource_id),
        )

        return {
          ...oldData,
          files: [...preservedFiles, ...updatedFiles],
        }
      },
    )
  }

  // Poll KB status for selected files
  const { data: kbStatusData, isLoading: isPollingQuery } = useQuery({
    queryKey: ["kb-status", activeIndexing?.knowledgeBaseId],
    queryFn: async () => {
      if (!activeIndexing) return null

      const { knowledgeBaseId, selectedFiles } = activeIndexing
      const allResults: KBResource[] = []

      // STEP 1: Handle individual files - query their parent folders
      const { files: individualFiles, folders: selectedFolders } =
        separateFilesByType(selectedFiles)

      if (individualFiles.length > 0) {
        // Get unique parent folders to avoid duplicate API calls
        const parentPaths = getUniqueParentPaths(individualFiles)

        // Query each parent folder
        for (const folderPath of parentPaths) {
          try {
            const folderStatus = await getKnowledgeBaseStatus(
              knowledgeBaseId,
              folderPath,
            )
            allResults.push(...folderStatus.data)
          } catch (error) {
            console.warn(
              `Failed to get status for folder ${folderPath}:`,
              error,
            )
          }
        }
      }

      // STEP 2: Handle selected folders - query their contents and create synthetic status
      for (const folder of selectedFolders) {
        try {
          const folderContents = await getKnowledgeBaseStatus(
            knowledgeBaseId,
            folder.inode_path.path,
          )

          // Update file tree cache for this folder
          updateFolderCache(folder, folderContents.data, knowledgeBaseId)

          // Aggregate folder status: if any file has error -> error, if all indexed -> indexed, else -> indexing
          const files = folderContents.data.filter(
            (f) => f.inode_type === "file",
          )
          const folderStatus =
            files.length === 0
              ? "indexed"
              : files.some((f) => f.status === "error")
                ? "error"
                : files.every((f) => f.status === "indexed")
                  ? "indexed"
                  : "indexing"

          allResults.push({
            resource_id: folder.resource_id,
            inode_type: "directory",
            inode_path: folder.inode_path,
            status: folderStatus,
          })
        } catch (error) {
          console.warn(
            `Failed to get folder contents for ${folder.inode_path.path}:`,
            error,
          )
        }
      }

      // STEP 3: Filter to only the files we actually selected
      const selectedPaths = new Set(selectedFiles.map((f) => f.inode_path.path))
      return {
        data: allResults.filter((r) => selectedPaths.has(r.inode_path.path)),
      }
    },
    enabled: !!activeIndexing,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    retry: 2,
  })

  // Update individual file status in cache (with recursive updates for folders)
  useEffect(() => {
    if (!activeIndexing || !kbStatusData?.data) return

    activeIndexing.selectedFiles.forEach((file) => {
      // Find status by path (handles resource ID changes)
      const kbResource = findKBResourceByPath(
        kbStatusData.data,
        file.inode_path.path,
      )

      if (kbResource) {
        const status = mapKBStatus(kbResource.status)

        // Use recursive update function to update file and its descendants
        updateFileAndDescendantsStatus(file, status, activeIndexing.knowledgeBaseId)
      }
    })
  }, [activeIndexing, kbStatusData, queryClient, updateFileAndDescendantsStatus])

  // Check if all files completed
  const { allFilesCompleted, allFilesSuccessful } = useMemo(() => {
    if (!activeIndexing || !kbStatusData?.data) {
      return { allFilesCompleted: false, allFilesSuccessful: false }
    }

    let completed = true
    let successful = true

    for (const file of activeIndexing.selectedFiles) {
      const kbResource = findKBResourceByPath(
        kbStatusData.data,
        file.inode_path.path,
      )

      if (!kbResource) {
        completed = false
        successful = false
        break
      }

      // Virtual directories are always considered completed/successful
      if (
        file.inode_type === "directory" &&
        kbResource.resource_id === "STACK_VFS_VIRTUAL_DIRECTORY"
      ) {
        continue
      }

      const isCompleted =
        kbResource.status === "indexed" || kbResource.status === "error"
      const isSuccessful = kbResource.status === "indexed"

      if (!isCompleted) {
        completed = false
        successful = false
        break
      }
      if (!isSuccessful) {
        successful = false
      }
    }

    return { allFilesCompleted: completed, allFilesSuccessful: successful }
  }, [activeIndexing, kbStatusData])

  return {
    isPolling: isPollingQuery && !!activeIndexing,
    updateFileStatus: () => {},
    allFilesCompleted,
    allFilesSuccessful,
  }
}
