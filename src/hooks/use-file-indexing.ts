"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  triggerKnowledgeBaseSync,
  deleteFromKnowledgeBase,
} from "@/lib/stack-ai-api"
import type { FileItem, ActiveIndexing, FilesResponse } from "@/lib/types"
import { useFileStatus } from "./use-file-status"

interface UseFileIndexingReturn {
  indexFiles: (selectedItems: FileItem[]) => void
  deindexFile: (file: FileItem) => void
  batchDeindexFiles: (selectedItems: FileItem[]) => void
  cancelIndexing: () => void
  isIndexing: boolean
  isPolling: boolean
  isActive: boolean
  activeIndexing: ActiveIndexing | null
}

export function useFileIndexing(): UseFileIndexingReturn {
  const queryClient = useQueryClient()
  const [activeIndexing, setActiveIndexing] = useState<ActiveIndexing | null>(
    null,
  )

  const { isPolling, allFilesCompleted, allFilesSuccessful } =
    useFileStatus(activeIndexing)

  // Update files in cache
  const updateFilesInCache = useCallback(
    (files: FileItem[], updateFn: (file: FileItem) => Partial<FileItem>) => {
      files.forEach((file) => {
        const targetQuery = file.parentId ? ["files", file.parentId] : ["files"]
        queryClient.setQueryData(
          targetQuery,
          (oldData: FilesResponse | undefined) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              files: oldData.files.map((f) =>
                f.resource_id === file.resource_id
                  ? { ...f, ...updateFn(file) }
                  : f,
              ),
            }
          },
        )
      })
    },
    [queryClient],
  )

  // Index files mutation
  const indexMutation = useMutation({
    mutationFn: async (selectedItems: FileItem[]) => {
      // Extract connection info from cache
      const rootData = queryClient.getQueryData<FilesResponse>(["files"])
      if (!rootData?.connection_id || !rootData?.org_id) {
        throw new Error(
          "Connection metadata not available. Please refresh the page.",
        )
      }

      // Create KB
      const newKb = await createKnowledgeBase(
        rootData.connection_id,
        selectedItems.map((item) => item.resource_id),
        `File Picker KB - ${new Date().toISOString()}`,
        "Knowledge Base created via file picker",
      )

      // Start sync
      await triggerKnowledgeBaseSync(newKb.knowledge_base_id)

      return { knowledgeBaseId: newKb.knowledge_base_id, selectedItems }
    },
    onMutate: async (selectedItems: FileItem[]) => {
      if (selectedItems.length === 0) {
        toast.error("No files selected for indexing")
        throw new Error("No files selected")
      }
      if (activeIndexing) {
        toast.error("Another indexing operation is already in progress")
        throw new Error("Indexing already in progress")
      }

      // Set all files to pending
      updateFilesInCache(selectedItems, () => ({
        indexingStatus: "pending" as const,
      }))

      toast.info("Indexing files...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { knowledgeBaseId, selectedItems } = data

      // Update files to indexing status
      updateFilesInCache(selectedItems, () => ({
        indexingStatus: "indexing" as const,
        kbResourceId: knowledgeBaseId,
      }))

      // Start polling
      setActiveIndexing({
        knowledgeBaseId,
        selectedFiles: selectedItems,
        startTime: Date.now(),
      })

      toast.success(
        `Indexing ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`,
      )
    },
    onError: (error, selectedItems) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      // Set files to error status
      updateFilesInCache(selectedItems, () => ({
        indexingStatus: "error" as const,
        indexingError: errorMessage,
      }))

      toast.error(`Failed to index files: ${errorMessage}`)
    },
  })

  // Deindex single file
  const deindexMutation = useMutation({
    mutationFn: async (file: FileItem) => {
      if (file.inode_type !== "file") {
        throw new Error("Only files can be de-indexed, not folders")
      }
      if (!file.kbResourceId) {
        throw new Error("File is not indexed - missing Knowledge Base ID")
      }

      await deleteFromKnowledgeBase(file.kbResourceId, file.inode_path.path)
      return { file }
    },
    onMutate: async (file: FileItem) => {
      // Optimistic update
      updateFilesInCache([file], () => ({
        indexingStatus: "not-indexed" as const,
        kbResourceId: undefined,
      }))

      toast.info(`Removing "${file.inode_path.path}" from knowledge base...`)
      return { file }
    },
    onSuccess: ({ file }) => {
      toast.success(`Removed "${file.inode_path.path}" from knowledge base`)
    },
    onError: (error, file) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      // Rollback
      updateFilesInCache([file], (f) => ({
        indexingStatus: "indexed" as const,
        kbResourceId: f.kbResourceId,
      }))

      toast.error(
        `Failed to remove "${file.inode_path.path}" from knowledge base: ${errorMessage}`,
      )
    },
  })

  // Batch deindex files
  const batchDeindexMutation = useMutation({
    mutationFn: async (selectedItems: FileItem[]) => {
      // Filter to only indexed files that have KB resource IDs
      const indexedFiles = selectedItems.filter(
        (item) =>
          item.inode_type === "file" &&
          item.indexingStatus === "indexed" &&
          item.kbResourceId,
      )

      if (indexedFiles.length === 0) {
        throw new Error("No indexed files found in selection")
      }

      // De-index each file from its respective Knowledge Base
      const results = await Promise.allSettled(
        indexedFiles.map(async (file) => {
          await deleteFromKnowledgeBase(
            file.kbResourceId!,
            file.inode_path.path,
          )
          return file
        }),
      )

      // Check for failures
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length > 0) {
        const firstError = (failures[0] as PromiseRejectedResult).reason
        throw new Error(`Failed to de-index some files: ${firstError.message}`)
      }

      return { selectedItems: indexedFiles }
    },
    onMutate: async (selectedItems: FileItem[]) => {
      const indexedFiles = selectedItems.filter(
        (item) => item.indexingStatus === "indexed" && item.kbResourceId,
      )

      if (indexedFiles.length === 0) {
        toast.error("No indexed files found in selection")
        throw new Error("No indexed files to de-index")
      }

      // Optimistic update
      updateFilesInCache(indexedFiles, () => ({
        indexingStatus: "not-indexed" as const,
        kbResourceId: undefined,
      }))

      toast.info(
        `Removing ${indexedFiles.length} file${indexedFiles.length !== 1 ? "s" : ""} from knowledge base...`,
      )
      return { indexedFiles }
    },
    onSuccess: ({ selectedItems }) => {
      toast.success(
        `Removed ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} from knowledge base`,
      )
    },
    onError: (error, _, context) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      // Rollback optimistic updates
      if (context?.indexedFiles) {
        updateFilesInCache(context.indexedFiles, (file) => ({
          indexingStatus: "indexed" as const,
          kbResourceId: file.kbResourceId,
        }))
      }

      toast.error(`Failed to remove files from knowledge base: ${errorMessage}`)
    },
  })

  // Handle completion
  useEffect(() => {
    if (allFilesCompleted && activeIndexing) {
      setActiveIndexing(null)
      if (allFilesSuccessful) {
        toast.success("Indexing completed!")
      } else {
        toast.error("Some files failed to index")
      }
    }
  }, [allFilesCompleted, allFilesSuccessful, activeIndexing])

  // Handle timeout
  useEffect(() => {
    if (!activeIndexing) return

    const timeoutMs = 5 * 60 * 1000
    const elapsed = Date.now() - activeIndexing.startTime

    if (elapsed >= timeoutMs) {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
      return
    }

    const timeoutId = setTimeout(() => {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
    }, timeoutMs - elapsed)

    return () => clearTimeout(timeoutId)
  }, [activeIndexing])

  const cancelIndexing = useCallback(() => {
    if (activeIndexing) {
      // Reset files to not-indexed
      updateFilesInCache(activeIndexing.selectedFiles, () => ({
        indexingStatus: "not-indexed" as const,
        kbResourceId: undefined,
      }))

      setActiveIndexing(null)
      toast.info(
        "Stopped monitoring indexing. Operations may continue in background.",
      )
    }
  }, [activeIndexing, updateFilesInCache])

  return {
    indexFiles: indexMutation.mutate,
    deindexFile: deindexMutation.mutate,
    batchDeindexFiles: batchDeindexMutation.mutate,
    cancelIndexing,
    isIndexing:
      indexMutation.isPending ||
      deindexMutation.isPending ||
      batchDeindexMutation.isPending,
    isPolling,
    isActive:
      indexMutation.isPending ||
      deindexMutation.isPending ||
      batchDeindexMutation.isPending ||
      isPolling,
    activeIndexing,
  }
}
