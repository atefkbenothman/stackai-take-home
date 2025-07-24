"use client"

import { X } from "lucide-react"
import { useSelection } from "@/contexts/selection-context"
import { Button } from "@/components/ui/button"
import type { FileItem } from "@/lib/types"
import { useCallback } from "react"

interface SelectionSummaryProps {
  allFiles?: FileItem[]
}

export function SelectionSummary({ allFiles = [] }: SelectionSummaryProps) {
  const { getSelectionSummary, clearSelection, selectAll } = useSelection()

  const summary = getSelectionSummary()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleSelectAll = useCallback(() => {
    selectAll(allFiles)
  }, [selectAll, allFiles])

  return (
    <div className="flex h-8 items-center border-t bg-gray-50 p-2">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-medium text-gray-700">
          {summary.count === 0
            ? "No items selected"
            : `${summary.count} item${summary.count !== 1 ? "s" : ""} selected`}
        </span>
        {summary.totalSize > 0 && (
          <span className="text-xs text-gray-600">
            ({formatFileSize(summary.totalSize)})
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center space-x-2">
        {allFiles.length > 0 && (
          <Button
            onClick={handleSelectAll}
            size="sm"
            className="h-6 rounded-xs px-2 text-xs hover:cursor-pointer"
          >
            Select All
          </Button>
        )}

        {summary.count > 0 && (
          <Button
            onClick={clearSelection}
            variant="secondary"
            size="sm"
            className="h-6 rounded-xs px-2 text-xs hover:cursor-pointer"
          >
            <X size={12} className="mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
