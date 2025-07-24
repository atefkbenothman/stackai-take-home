"use client"

import React from "react"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Circle,
} from "lucide-react"
import type { FileItem } from "@/lib/types"
import { FileTreeItemSkeleton } from "@/components/file-tree/file-tree-item-skeleton"
import { useSelection } from "@/hooks/use-selection"
import { Checkbox } from "@/components/ui/checkbox"
import { useFolderOperations } from "@/hooks/use-folder-operations"
import {
  formatDate,
  sortFiles,
  filterByExtension,
  type SortOption,
} from "@/lib/utils"

interface FileTreeItemProps {
  item: FileItem
  level?: number
  sortBy: SortOption
  filterExtension?: string
}

export function FileTreeItem({
  item,
  level = 0,
  sortBy,
  filterExtension = "all",
}: FileTreeItemProps) {
  const isFolder = item.inode_type === "directory"

  const {
    isSelected,
    toggleSelection,
    toggleFolderSelection,
    isIndeterminate,
  } = useSelection()

  const {
    isExpanded,
    folderData,
    isLoading,
    error,
    toggleExpansion,
    prefetch,
  } = useFolderOperations(item)

  const itemIsSelected = isSelected(item.resource_id)
  const itemIsIndeterminate = isFolder
    ? isIndeterminate(item, folderData?.files || [])
    : false

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center border-b px-2 py-1 transition-colors hover:bg-gray-50 ${
          itemIsSelected ? "bg-blue-100" : ""
        }`}
        style={{ paddingLeft: `${level * 26 + 8}px` }}
        onClick={toggleExpansion}
        onMouseEnter={prefetch}
      >
        <Checkbox
          checked={itemIsIndeterminate ? "indeterminate" : itemIsSelected}
          onCheckedChange={() => {
            if (isFolder && folderData?.files) {
              // Filter to only include direct children of this specific folder
              const validChildren = folderData.files.filter(
                (child) => child.parentId === item.resource_id,
              )
              toggleFolderSelection(item, validChildren)
            } else {
              toggleSelection(item)
            }
          }}
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
          <span className="font-mono text-sm whitespace-nowrap">
            {item.inode_path.path}
          </span>
        </div>

        {/* Indexing status indicator */}
        {item.indexingStatus && (
          <div className="ml-2 flex items-center">
            <span
              className={`inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium ${
                item.indexingStatus === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : item.indexingStatus === "indexing"
                    ? "bg-blue-100 text-blue-800"
                    : item.indexingStatus === "indexed"
                      ? "bg-green-100 text-green-800"
                      : item.indexingStatus === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
              }`}
            >
              {item.indexingStatus === "pending" && (
                <>
                  <Clock size={12} />
                  Pending
                </>
              )}
              {item.indexingStatus === "indexing" && (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Indexing
                </>
              )}
              {item.indexingStatus === "indexed" && (
                <>
                  <CheckCircle size={12} />
                  Indexed
                </>
              )}
              {item.indexingStatus === "error" && (
                <>
                  <XCircle size={12} />
                  Error
                </>
              )}
              {item.indexingStatus === "not-indexed" && (
                <>
                  <Circle size={12} />
                  Not Indexed
                </>
              )}
            </span>
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
