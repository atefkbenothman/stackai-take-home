"use client"

import { memo, useCallback } from "react"
import { useFileIndexing } from "@/hooks/use-file-indexing"
import { useSelectionStore } from "@/stores/selection-store"
import { Button } from "@/components/ui/button"
import type { FileItem } from "@/lib/types"

interface FileTreeFooterProps {
  allFiles?: FileItem[]
}

function FileTreeFooterComponent({ allFiles = [] }: FileTreeFooterProps) {
  const selectedCount = useSelectionStore((state) => state.selectedItems.size)
  const getMinimalSelectedItems = useSelectionStore(
    (state) => state.getMinimalSelectedItems,
  )
  const selectAll = useSelectionStore((state) => state.selectAll)
  const clearSelection = useSelectionStore((state) => state.clearSelection)

  const { indexFiles, isIndexing, isPolling } = useFileIndexing()

  const handleIndexFiles = useCallback(() => {
    const selectedItems = getMinimalSelectedItems()
    indexFiles(selectedItems)
    clearSelection()
  }, [getMinimalSelectedItems, indexFiles, clearSelection])

  return (
    <div className="flex h-8 items-center border-t bg-gray-50 p-2">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-medium text-gray-500">
          {selectedCount === 0
            ? "No items selected"
            : `${selectedCount} item${selectedCount !== 1 ? "s" : ""} selected`}
        </span>
      </div>

      <div className="ml-auto flex items-center space-x-2">
        {allFiles.length > 0 && (
          <Button
            onClick={() => selectAll(allFiles)}
            size="sm"
            className="h-6 rounded-xs px-2 text-xs hover:cursor-pointer"
          >
            Select All
          </Button>
        )}

        {selectedCount > 0 && (
          <>
            <Button
              onClick={handleIndexFiles}
              disabled={isIndexing || isPolling}
              size="sm"
              className="h-6 rounded-xs bg-blue-500 px-2 text-xs text-white hover:cursor-pointer hover:bg-blue-600"
            >
              {isIndexing
                ? "Creating KB..."
                : isPolling
                  ? "Monitoring..."
                  : "Index"}
            </Button>
            <Button
              onClick={clearSelection}
              variant="outline"
              size="sm"
              className="h-6 rounded-xs px-2 text-xs hover:cursor-pointer"
            >
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export const FileTreeFooter = memo(FileTreeFooterComponent)
