"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react"
import type {
  FileItem,
  SelectionContextType,
  SelectionState,
} from "@/lib/types"

const SelectionContext = createContext<SelectionContextType | null>(null)

interface SelectionProviderProps {
  children: React.ReactNode
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: new Set<string>(),
    selectedItems: new Map<string, FileItem>(),
    folderSelectionIntent: new Set<string>(),
  })

  const toggleSelection = useCallback((item: FileItem) => {
    setSelectionState((prev) => {
      const newSelectedIds = new Set(prev.selectedIds)
      const newSelectedItems = new Map(prev.selectedItems)
      const newFolderSelectionIntent = new Set(prev.folderSelectionIntent)

      if (prev.selectedIds.has(item.resource_id)) {
        // Deselect item
        newSelectedIds.delete(item.resource_id)
        newSelectedItems.delete(item.resource_id)
        newFolderSelectionIntent.delete(item.resource_id)
      } else {
        // Select item
        newSelectedIds.add(item.resource_id)
        newSelectedItems.set(item.resource_id, item)

        // If it's a folder, mark it for selection intent
        if (item.inode_type === "directory") {
          newFolderSelectionIntent.add(item.resource_id)
        }
      }

      return {
        selectedIds: newSelectedIds,
        selectedItems: newSelectedItems,
        folderSelectionIntent: newFolderSelectionIntent,
      }
    })
  }, [])

  const toggleFolderSelection = useCallback(
    (folder: FileItem, children: FileItem[] = []) => {
      setSelectionState((prev) => {
        const newSelectedIds = new Set(prev.selectedIds)
        const newSelectedItems = new Map(prev.selectedItems)
        const newFolderSelectionIntent = new Set(prev.folderSelectionIntent)

        const isCurrentlySelected = prev.selectedIds.has(folder.resource_id)

        if (isCurrentlySelected) {
          // Deselect folder and all children recursively
          newSelectedIds.delete(folder.resource_id)
          newSelectedItems.delete(folder.resource_id)
          newFolderSelectionIntent.delete(folder.resource_id)

          // Recursively deselect all children
          const deselectedChildren = (items: FileItem[]) => {
            items.forEach((child) => {
              newSelectedIds.delete(child.resource_id)
              newSelectedItems.delete(child.resource_id)
              newFolderSelectionIntent.delete(child.resource_id)
            })
          }
          deselectedChildren(children)
        } else {
          // Select folder and all children recursively
          newSelectedIds.add(folder.resource_id)
          newSelectedItems.set(folder.resource_id, folder)
          newFolderSelectionIntent.add(folder.resource_id)

          // Recursively select all children
          const selectChildren = (items: FileItem[]) => {
            items.forEach((child) => {
              newSelectedIds.add(child.resource_id)
              newSelectedItems.set(child.resource_id, child)

              if (child.inode_type === "directory") {
                newFolderSelectionIntent.add(child.resource_id)
              }
            })
          }
          selectChildren(children)
        }

        return {
          selectedIds: newSelectedIds,
          selectedItems: newSelectedItems,
          folderSelectionIntent: newFolderSelectionIntent,
        }
      })
    },
    [],
  )

  const selectAll = useCallback((items: FileItem[]) => {
    setSelectionState((prev) => {
      const newSelectedIds = new Set(prev.selectedIds)
      const newSelectedItems = new Map(prev.selectedItems)
      const newFolderSelectionIntent = new Set(prev.folderSelectionIntent)

      items.forEach((item) => {
        newSelectedIds.add(item.resource_id)
        newSelectedItems.set(item.resource_id, item)

        if (item.inode_type === "directory") {
          newFolderSelectionIntent.add(item.resource_id)
        }
      })

      return {
        selectedIds: newSelectedIds,
        selectedItems: newSelectedItems,
        folderSelectionIntent: newFolderSelectionIntent,
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedIds: new Set<string>(),
      selectedItems: new Map<string, FileItem>(),
      folderSelectionIntent: new Set<string>(),
    })
  }, [])

  const isSelected = useCallback(
    (itemId: string) => {
      return selectionState.selectedIds.has(itemId)
    },
    [selectionState.selectedIds],
  )

  const getSelectedItems = useCallback(() => {
    return Array.from(selectionState.selectedItems.values())
  }, [selectionState.selectedItems])

  const getMinimalSelectedItems = useCallback(() => {
    const allSelected = Array.from(selectionState.selectedItems.values())

    // Filter out items whose parent folder is already selected
    return allSelected.filter((item) => {
      const itemPath = item.inode_path.path

      // Check if any other selected item is a parent of this item
      const hasSelectedParent = allSelected.some((potentialParent) => {
        if (potentialParent.resource_id === item.resource_id) return false
        if (potentialParent.inode_type !== "directory") return false

        const parentPath = potentialParent.inode_path.path
        // Check if itemPath starts with parentPath followed by /
        return itemPath.startsWith(parentPath + "/")
      })

      return !hasSelectedParent
    })
  }, [selectionState.selectedItems])

  const getSelectionSummary = useMemo(() => {
    const items = Array.from(selectionState.selectedItems.values())
    const count = items.length
    const totalSize = items.reduce((sum, item) => {
      return sum + (item.dataloader_metadata?.size || 0)
    }, 0)

    return {
      count,
      totalSize,
    }
  }, [selectionState.selectedItems])

  const isIndeterminate = useCallback(
    (folder: FileItem, children: FileItem[] = []) => {
      if (folder.inode_type !== "directory") {
        return false // Not a folder
      }

      if (selectionState.selectedIds.has(folder.resource_id)) {
        return false // Fully selected, not indeterminate
      }

      const folderPath = folder.inode_path.path

      // Check if any selected item is a descendant of this folder
      const selectedDescendants = Array.from(
        selectionState.selectedItems.values(),
      ).filter(
        (item) =>
          item.resource_id !== folder.resource_id &&
          item.inode_path.path.startsWith(folderPath + "/"),
      )

      if (selectedDescendants.length === 0) {
        return false // No descendants selected
      }

      // Has at least one descendant selected
      // If we have children data, check if all immediate children are selected
      if (children.length > 0) {
        const allChildrenSelected = children.every((child) =>
          selectionState.selectedIds.has(child.resource_id),
        )
        return !allChildrenSelected // Indeterminate if not all children selected
      }

      // No children data (collapsed), but has descendants selected
      return true
    },
    [selectionState.selectedIds, selectionState.selectedItems],
  )

  const contextValue: SelectionContextType = useMemo(
    () => ({
      ...selectionState,
      toggleSelection,
      toggleFolderSelection,
      selectAll,
      clearSelection,
      isSelected,
      isIndeterminate,
      getSelectedItems,
      getMinimalSelectedItems,
      getSelectionSummary: () => getSelectionSummary,
    }),
    [
      selectionState,
      toggleSelection,
      toggleFolderSelection,
      selectAll,
      clearSelection,
      isSelected,
      isIndeterminate,
      getSelectedItems,
      getMinimalSelectedItems,
      getSelectionSummary,
    ],
  )

  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider")
  }
  return context
}
