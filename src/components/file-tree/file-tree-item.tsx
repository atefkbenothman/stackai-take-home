"use client"

import React from "react"
import { Plus, Minus, Folder, FolderOpen, File } from "lucide-react"
import type { FileItem } from "@/lib/types"
import { FileSkeleton } from "@/components/file-tree/file-skeleton"
import { useSelection } from "@/contexts/selection-context"
import { Checkbox } from "@/components/ui/checkbox"
import { useFolderExpansion } from "@/hooks/use-folder-expansion"
import { useFolderPrefetch } from "@/hooks/use-folder-prefetch"

interface FileTreeItemProps {
  item: FileItem
  level?: number
}

export function FileTreeItem({ item, level = 0 }: FileTreeItemProps) {
  const isFolder = item.inode_type === "directory"

  const {
    isSelected,
    toggleSelection,
    toggleFolderSelection,
    isIndeterminate,
  } = useSelection()

  // Auto-select children if this folder was marked for selection intent
  const handleSelectionIntent = (children: FileItem[]) => {
    if (isSelected(item.resource_id)) {
      // This folder is selected, so auto-select all its children
      children.forEach((child) => {
        if (!isSelected(child.resource_id)) {
          toggleSelection(child)
        }
      })
    }
  }

  const { isExpanded, folderData, isLoading, error, handleToggle } =
    useFolderExpansion({
      folderId: item.resource_id,
      isFolder,
      folderName: item.inode_path.path,
      onSelectionIntent: handleSelectionIntent,
    })

  const { handleMouseEnter } = useFolderPrefetch({
    folderId: item.resource_id,
    isFolder,
    isExpanded,
  })

  const itemIsSelected = isSelected(item.resource_id)
  const itemIsIndeterminate = isFolder
    ? isIndeterminate(item.resource_id, folderData?.files || [])
    : false

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center px-2 py-1 transition-colors hover:bg-gray-50 ${
          itemIsSelected ? "bg-blue-50" : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
      >
        <Checkbox
          checked={itemIsIndeterminate ? "indeterminate" : itemIsSelected}
          onCheckedChange={() => {
            if (isFolder && folderData?.files) {
              toggleFolderSelection(item, folderData.files)
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
              <Minus size={12} />
            ) : (
              <Plus size={12} />
            )
          ) : null}
        </div>

        <div className="mr-2 flex h-5 w-5 items-center justify-center text-gray-600">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <File size={16} />
          )}
        </div>

        <div className="flex-1 overflow-x-auto min-w-0">
          <span className="font-mono text-sm whitespace-nowrap">
            {item.inode_path.path}
          </span>
        </div>
      </div>

      {isFolder && isExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-150">
          {isLoading && <FileSkeleton level={level + 1} />}
          {!isLoading && !error && folderData?.files && (
            <div>
              {folderData.files.map((childFile: FileItem) => (
                <FileTreeItem
                  key={childFile.resource_id}
                  item={childFile}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
