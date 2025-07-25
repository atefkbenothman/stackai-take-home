"use client"

import { memo, useCallback } from "react"
import { useFileIndexing } from "@/hooks/use-file-indexing"
import { useSelectionStore } from "@/stores/selection-store"
import { Button } from "@/components/ui/button"

function FileTreeFooterComponent() {
  const selectedCount = useSelectionStore((state) => state.selectedItems.size)
  const getMinimalSelectedItems = useSelectionStore(
    (state) => state.getMinimalSelectedItems,
  )
  const clearSelection = useSelectionStore((state) => state.clearSelection)

  const {
    indexFiles,
    batchDeindexFiles,
    cancelIndexing,
    isIndexing,
    activeIndexing,
  } = useFileIndexing()

  const selectedItems = getMinimalSelectedItems()

  const hasIndexedFolders = selectedItems.some(
    (item) =>
      item.inode_type === "directory" && item.indexingStatus === "indexed",
  )

  const indexableItems = selectedItems
  const indexedItems = indexableItems.filter(
    (item) => item.indexingStatus === "indexed",
  )
  const notIndexedItems = indexableItems.filter(
    (item) => item.indexingStatus !== "indexed",
  )

  // Only files can be de-indexed
  const selectedFiles = selectedItems.filter(
    (item) => item.inode_type === "file",
  )
  const indexedSelectedFiles = selectedFiles.filter(
    (item) => item.indexingStatus === "indexed",
  )

  const selectionState = (() => {
    if (selectedItems.length === 0) {
      return "none-selected"
    }

    // All selected items are indexed - show de-index option (but only if files are present)
    if (indexedItems.length === selectedItems.length) {
      return "all-indexed"
    }

    // No selected items are indexed - show index option
    if (notIndexedItems.length === selectedItems.length) {
      return "none-indexed"
    }

    // Mixed indexing states
    return "mixed"
  })()

  const handleIndexFiles = useCallback(() => {
    const selectedItems = getMinimalSelectedItems()
    indexFiles(selectedItems)
    clearSelection()
  }, [getMinimalSelectedItems, indexFiles, clearSelection])

  const handleDeindexFiles = useCallback(() => {
    const selectedItems = getMinimalSelectedItems()
    // Filter to only include files as per take-home requirements
    const filesToDeindex = selectedItems.filter(
      (item) => item.inode_type === "file",
    )

    if (filesToDeindex.length === 0) {
      // This shouldn't happen due to UI logic, but adding as safeguard
      return
    }

    batchDeindexFiles(filesToDeindex)
    clearSelection()
  }, [getMinimalSelectedItems, batchDeindexFiles, clearSelection])

  return (
    <div className="flex h-8 items-center border-t bg-gray-50 p-2">
      <div className="flex items-center space-x-3">
        <span className="text-[10px] font-medium text-gray-500">
          {selectedCount === 0
            ? "No items selected"
            : `${selectedCount} item${selectedCount !== 1 ? "s" : ""} selected`}
        </span>
      </div>

      <div className="ml-auto flex items-center space-x-2">
        {!!activeIndexing && (
          <Button
            onClick={cancelIndexing}
            variant="outline"
            size="sm"
            className="h-6 rounded-xs border-red-300 px-2 text-xs text-red-600 hover:cursor-pointer hover:bg-red-50"
          >
            Cancel
          </Button>
        )}

        {selectedCount > 0 && (
          <>
            <Button
              onClick={clearSelection}
              variant="outline"
              size="sm"
              className="h-6 rounded-xs px-2 text-xs hover:cursor-pointer"
            >
              Clear
            </Button>

            {selectionState === "all-indexed" &&
              indexedSelectedFiles.length > 0 && (
                <Button
                  onClick={handleDeindexFiles}
                  disabled={isIndexing}
                  size="sm"
                  className="h-6 rounded-xs bg-red-500 px-2 text-xs text-white hover:cursor-pointer hover:bg-red-600"
                  title={
                    hasIndexedFolders
                      ? "Only files can be de-indexed. Folders will be skipped."
                      : undefined
                  }
                >
                  {isIndexing
                    ? "De-indexing..."
                    : `De-index ${indexedSelectedFiles.length} file${indexedSelectedFiles.length !== 1 ? "s" : ""}`}
                </Button>
              )}

            {selectionState === "all-indexed" &&
              indexedSelectedFiles.length === 0 && (
                <Button
                  disabled={true}
                  size="sm"
                  className="h-6 rounded-xs px-2 text-xs disabled:cursor-not-allowed disabled:bg-gray-400"
                  title="Only files can be de-indexed. Folders are already indexed and cannot be de-indexed individually."
                >
                  All Indexed
                </Button>
              )}

            {selectionState === "none-indexed" && (
              <Button
                onClick={handleIndexFiles}
                disabled={isIndexing}
                size="sm"
                className="h-6 rounded-xs bg-blue-500 px-2 text-xs text-white hover:cursor-pointer hover:bg-blue-600"
              >
                {isIndexing ? "Indexing..." : "Index"}
              </Button>
            )}

            {selectionState === "mixed" && (
              <Button
                onClick={handleIndexFiles}
                disabled={true}
                size="sm"
                className="h-6 rounded-xs px-2 text-xs disabled:cursor-not-allowed disabled:bg-gray-400"
                title="Mixed selection - some items indexed, some not. Clear selection and choose items with same status."
              >
                Mixed Selection
              </Button>
            )}
          </>
        )}

        {(selectedCount === 0 || selectionState === "none-selected") && (
          <Button
            onClick={handleIndexFiles}
            disabled={true}
            size="sm"
            className="h-6 rounded-xs px-2 text-xs disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Index
          </Button>
        )}
      </div>
    </div>
  )
}

export const FileTreeFooter = memo(FileTreeFooterComponent)
