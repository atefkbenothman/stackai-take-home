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
    isPolling,
    activeIndexing,
  } = useFileIndexing()

  const selectedItems = getMinimalSelectedItems()
  const indexedFiles = selectedItems.filter(
    (item) => item.indexingStatus === "indexed",
  )
  const notIndexedFiles = selectedItems.filter(
    (item) => item.indexingStatus !== "indexed",
  )

  const selectionState =
    indexedFiles.length === selectedItems.length
      ? "all-indexed"
      : notIndexedFiles.length === selectedItems.length
        ? "none-indexed"
        : "mixed"

  const handleIndexFiles = useCallback(() => {
    const selectedItems = getMinimalSelectedItems()
    indexFiles(selectedItems)
    clearSelection()
  }, [getMinimalSelectedItems, indexFiles, clearSelection])

  const handleDeindexFiles = useCallback(() => {
    const selectedItems = getMinimalSelectedItems()
    batchDeindexFiles(selectedItems)
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

            {selectionState === "all-indexed" && (
              <Button
                onClick={handleDeindexFiles}
                disabled={isIndexing || isPolling}
                size="sm"
                className="h-6 rounded-xs bg-red-500 px-2 text-xs text-white hover:cursor-pointer hover:bg-red-600"
              >
                {isIndexing ? "De-indexing..." : "De-index"}
              </Button>
            )}

            {selectionState === "none-indexed" && (
              <Button
                onClick={handleIndexFiles}
                disabled={isIndexing || isPolling}
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
              >
                Mixed Selection
              </Button>
            )}
          </>
        )}

        {selectedCount === 0 && (
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
