"use client"

import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  createKnowledgeBase,
  triggerKnowledgeBaseSync,
  deleteFromKnowledgeBase,
} from "@/lib/stack-ai-api"
import type { FileItem, ActiveIndexing, FilesResponse } from "@/lib/types"
import { useFileStatus } from "@/hooks/use-file-status"

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

async function indexFilesAPI(
  selectedItems: FileItem[],
  queryClient: QueryClient,
) {
  // Extract connection metadata from existing TanStack Query cache
  const rootData = queryClient.getQueryData<FilesResponse>(["files"])
  const connectionId = rootData?.connection_id
  const orgId = rootData?.org_id

  if (!connectionId || !orgId) {
    throw new Error(
      "Connection metadata not available. Please refresh the page.",
    )
  }

  // Extract resource IDs
  const selectedResourceIds = selectedItems.map((item) => item.resource_id)

  // Create KB with files included
  const newKb = await createKnowledgeBase(
    connectionId,
    selectedResourceIds,
    `File Picker KB - ${new Date().toISOString()}`,
    "Knowledge Base created via file picker",
  )

  await triggerKnowledgeBaseSync(newKb.knowledge_base_id)

  return { knowledgeBaseId: newKb.knowledge_base_id, selectedItems }
}

async function deindexFileAPI(file: FileItem) {
  if (file.inode_type !== "file") {
    throw new Error("Only files can be de-indexed, not folders")
  }

  if (!file.kbResourceId) {
    throw new Error("File is not indexed - missing Knowledge Base ID")
  }

  // Use the resource path for deletion as per the Jupyter notebook
  await deleteFromKnowledgeBase(file.kbResourceId, file.inode_path.path)

  return { file }
}

async function batchDeindexFilesAPI(selectedItems: FileItem[]) {
  // Filter to only indexed files (not folders) that have KB resource IDs
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
      await deleteFromKnowledgeBase(file.kbResourceId!, file.inode_path.path)
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
}

export function useFileIndexing(): UseFileIndexingReturn {
  const queryClient = useQueryClient()
  const [activeIndexing, setActiveIndexing] = useState<ActiveIndexing | null>(
    null,
  )

  // Use the file status hook for status monitoring
  const { isPolling, updateFileStatus, allFilesCompleted, allFilesSuccessful } =
    useFileStatus(activeIndexing)

  // Knowledge Base indexing mutation
  const mutation = useMutation({
    mutationFn: (selectedItems: FileItem[]) =>
      indexFilesAPI(selectedItems, queryClient),
    onMutate: async (selectedItems: FileItem[]) => {
      if (selectedItems.length === 0) {
        toast.error("No files selected for indexing")
        throw new Error("No files selected")
      }

      // Prevent multiple simultaneous indexing operations
      if (activeIndexing) {
        toast.error("Another indexing operation is already in progress")
        throw new Error("Indexing already in progress")
      }

      // Optimistically update all selected files to "pending" status
      selectedItems.forEach((item) => {
        updateFileStatus(
          queryClient,
          item.resource_id,
          "pending",
          undefined,
          undefined,
          item,
        )
      })

      toast.info("Indexing files...")
      return { selectedItems }
    },
    onSuccess: (data) => {
      const { knowledgeBaseId, selectedItems } = data

      // Immediately set files to "indexing" status since KB creation succeeded
      selectedItems.forEach((item) => {
        updateFileStatus(
          queryClient,
          item.resource_id,
          "indexing",
          undefined,
          knowledgeBaseId,
          item,
        )
      })

      // Start status polling
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
      // Rollback optimistic updates - set files back to "error"
      selectedItems.forEach((item) => {
        updateFileStatus(
          queryClient,
          item.resource_id,
          "error",
          error instanceof Error ? error.message : "Unknown error",
          undefined,
          item,
        )
      })

      toast.error(
        `Failed to index files: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  // Stop polling when all files are completed and show appropriate toast
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

  useEffect(() => {
    if (!activeIndexing) return

    const timeoutMs = 5 * 60 * 1000 // 5 minutes
    const elapsed = Date.now() - activeIndexing.startTime

    if (elapsed >= timeoutMs) {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
      return
    }

    const remainingTime = timeoutMs - elapsed
    const timeoutId = setTimeout(() => {
      setActiveIndexing(null)
      toast.error(
        "Indexing timed out after 5 minutes. Please check status manually.",
      )
    }, remainingTime)

    return () => clearTimeout(timeoutId)
  }, [activeIndexing])

  // De-indexing mutation for individual files
  const deindexMutation = useMutation({
    mutationFn: deindexFileAPI,
    onMutate: async (file: FileItem) => {
      // Optimistically update file to "not-indexed" status
      updateFileStatus(
        queryClient,
        file.resource_id,
        "not-indexed",
        undefined,
        undefined,
        file,
      )

      toast.info(`Removing "${file.inode_path.path}" from knowledge base...`)
      return { file }
    },
    onSuccess: (data) => {
      const { file } = data
      toast.success(`Removed "${file.inode_path.path}" from knowledge base`)
    },
    onError: (error, file) => {
      // Rollback optimistic update - restore the indexed status
      updateFileStatus(
        queryClient,
        file.resource_id,
        "indexed",
        undefined,
        file.kbResourceId,
        file,
      )

      toast.error(
        `Failed to remove "${file.inode_path.path}" from knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  // Batch de-indexing mutation for multiple files
  const batchDeindexMutation = useMutation({
    mutationFn: batchDeindexFilesAPI,
    onMutate: async (selectedItems: FileItem[]) => {
      const indexedFiles = selectedItems.filter(
        (item) => item.indexingStatus === "indexed" && item.kbResourceId,
      )

      if (indexedFiles.length === 0) {
        toast.error("No indexed files found in selection")
        throw new Error("No indexed files to de-index")
      }

      // Optimistically update all indexed files to "not-indexed" status
      indexedFiles.forEach((item) => {
        updateFileStatus(
          queryClient,
          item.resource_id,
          "not-indexed",
          undefined,
          undefined,
          item,
        )
      })

      toast.info(
        `Removing ${indexedFiles.length} file${indexedFiles.length !== 1 ? "s" : ""} from knowledge base...`,
      )
      return { indexedFiles }
    },
    onSuccess: (data) => {
      const { selectedItems } = data
      toast.success(
        `Removed ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} from knowledge base`,
      )
    },
    onError: (error, _, context) => {
      // Rollback optimistic updates - restore indexed status for all files
      if (context?.indexedFiles) {
        context.indexedFiles.forEach((item: FileItem) => {
          updateFileStatus(
            queryClient,
            item.resource_id,
            "indexed",
            undefined,
            item.kbResourceId,
            item,
          )
        })
      }

      toast.error(
        `Failed to remove files from knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    },
  })

  const isIndexing =
    mutation.isPending ||
    deindexMutation.isPending ||
    batchDeindexMutation.isPending
  const isActive = isIndexing || isPolling

  // Cancel function to stop monitoring and reset state
  const cancelIndexing = useCallback(() => {
    if (activeIndexing) {
      // Rollback optimistic updates - reset files to previous states
      activeIndexing.selectedFiles.forEach((file) => {
        updateFileStatus(
          queryClient,
          file.resource_id,
          "not-indexed",
          undefined,
          undefined,
          file,
        )
      })

      setActiveIndexing(null)

      toast.info(
        "Stopped monitoring indexing. Operations may continue in background.",
      )
    }
  }, [activeIndexing, queryClient, updateFileStatus])

  return {
    indexFiles: mutation.mutate,
    deindexFile: deindexMutation.mutate,
    batchDeindexFiles: batchDeindexMutation.mutate,
    cancelIndexing,
    isIndexing,
    isPolling,
    isActive,
    activeIndexing,
  }
}
