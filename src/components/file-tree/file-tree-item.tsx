"use client"

import { memo, useCallback, useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { FileTreeItemSkeleton } from "@/components/file-tree/file-tree-item-skeleton"
import { StatusBadge } from "@/components/file-tree/file-tree-status-badge"
import { useFolderOperations } from "@/hooks/use-folder-operations"
import { useSelectionStore } from "@/stores/selection-store"
import type { FileItem } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import {
  sortFiles,
  filterByExtension,
  type SortOption,
} from "@/hooks/use-file-tree-data"

interface FileTreeItemProps {
  item: FileItem
  level?: number
  sortBy: SortOption
  filterExtension?: string
}

function FileTreeItemComponent({
  item,
  level = 0,
  sortBy,
  filterExtension = "all",
}: FileTreeItemProps) {
  const isFolder = item.inode_type === "directory"

  const [isSelected, setIsSelected] = useState(() =>
    useSelectionStore.getState().selectedItems.has(item.resource_id),
  )

  // Subscribe only to changes that affect this specific item
  useEffect(() => {
    const unsubscribe = useSelectionStore.subscribe((state, prevState) => {
      const wasSelected = prevState.selectedItems.has(item.resource_id)
      const isNowSelected = state.selectedItems.has(item.resource_id)

      if (wasSelected !== isNowSelected) {
        setIsSelected(isNowSelected)
      }
    })

    return unsubscribe
  }, [item.resource_id])

  const toggleSelection = useSelectionStore((state) => state.toggleSelection)
  const toggleFolderSelectionRecursive = useSelectionStore(
    (state) => state.toggleFolderSelectionRecursive,
  )
  
  const queryClient = useQueryClient()

  const {
    isExpanded,
    folderData,
    isLoading,
    error,
    toggleExpansion,
    prefetch,
  } = useFolderOperations(item)

  const handleCheckboxChange = useCallback(() => {
    if (isFolder) {
      toggleFolderSelectionRecursive(item, queryClient)
    } else {
      toggleSelection(item)
    }
  }, [
    isFolder,
    item,
    toggleFolderSelectionRecursive,
    toggleSelection,
    queryClient,
  ])

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center border-b px-2 py-1 transition-colors hover:bg-gray-50 ${
          isSelected ? "bg-blue-100" : ""
        }`}
        style={{ paddingLeft: `${level * 26 + 8}px` }}
        onClick={toggleExpansion}
        onMouseEnter={prefetch}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="mr-2 hover:cursor-pointer"
        />

        <div className="mr-2 flex h-4 w-4 items-center justify-center text-gray-500">
          {isFolder ? (
            isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : null}
        </div>

        <div className="mr-2 flex h-5 w-5 items-center justify-center text-gray-600">
          {isFolder ? (
            <div className="text-blue-600">
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </div>
          ) : (
            <File size={16} />
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <span className="font-mono text-xs whitespace-nowrap">
            {item.inode_path.path}
          </span>
        </div>

        {/* Indexing status indicator */}
        {item.indexingStatus && item.indexingStatus !== "not-indexed" && (
          <div className="ml-2 flex items-center">
            <StatusBadge status={item.indexingStatus} />
          </div>
        )}

        {/* Last modified date */}
        {item.modified_at && (
          <div className="ml-2 flex items-center">
            <span className="font-mono text-[10px] whitespace-nowrap text-gray-400">
              {formatDate(item.modified_at)}
            </span>
          </div>
        )}
      </div>

      {isFolder && isExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-150">
          {isLoading && (
            <div className="border-b">
              <FileTreeItemSkeleton level={level + 1} />
            </div>
          )}
          {!isLoading && !error && folderData?.files && (
            <div>
              {sortFiles(
                filterByExtension(folderData.files, filterExtension),
                sortBy,
              ).map((childFile: FileItem) => (
                <FileTreeItem
                  key={childFile.resource_id}
                  item={childFile}
                  level={level + 1}
                  sortBy={sortBy}
                  filterExtension={filterExtension}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const FileTreeItem = memo(FileTreeItemComponent)
