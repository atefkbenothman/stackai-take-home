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
    selectedItems: new Map<string, FileItem>(),
  })

  const selectedIds = useMemo(
    () => new Set(selectionState.selectedItems.keys()),
    [selectionState.selectedItems],
  )

  const selectedFolders = useMemo(
    () =>
      new Set(
        [...selectionState.selectedItems.values()]
          .filter((item) => item.inode_type === "directory")
          .map((item) => item.resource_id),
      ),
    [selectionState.selectedItems],
  )

  const toggleSelection = useCallback((item: FileItem) => {
    setSelectionState((prev) => {
      const newSelectedItems = new Map(prev.selectedItems)

      if (prev.selectedItems.has(item.resource_id)) {
        // Deselect item
        newSelectedItems.delete(item.resource_id)
      } else {
        // Select item
        newSelectedItems.set(item.resource_id, item)
      }

      return {
        selectedItems: newSelectedItems,
      }
    })
  }, [])

  const toggleFolderSelection = useCallback(
    (folder: FileItem, children: FileItem[] = []) => {
      setSelectionState((prev) => {
        const newSelectedItems = new Map(prev.selectedItems)

        const isCurrentlySelected = prev.selectedItems.has(folder.resource_id)

        // Filter children to only include direct children of this specific folder
        const validChildren = children.filter(
          (child) => child.parentId === folder.resource_id,
        )

        if (isCurrentlySelected) {
          // Deselect folder and all valid children
          newSelectedItems.delete(folder.resource_id)

          // Recursively deselect all valid children
          validChildren.forEach((child) => {
            newSelectedItems.delete(child.resource_id)
          })
        } else {
          // Select folder and all valid children
          newSelectedItems.set(folder.resource_id, folder)

          // Recursively select all valid children
          validChildren.forEach((child) => {
            newSelectedItems.set(child.resource_id, child)
          })
        }

        return {
          selectedItems: newSelectedItems,
        }
      })
    },
    [],
  )

  const selectAll = useCallback((items: FileItem[]) => {
    setSelectionState((prev) => {
      const newSelectedItems = new Map(prev.selectedItems)

      items.forEach((item) => {
        newSelectedItems.set(item.resource_id, item)
      })

      return {
        selectedItems: newSelectedItems,
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedItems: new Map<string, FileItem>(),
    })
  }, [])

  const isSelected = useCallback(
    (itemId: string) => {
      return selectedIds.has(itemId)
    },
    [selectedIds],
  )

  const getSelectedItems = useCallback(() => {
    return Array.from(selectionState.selectedItems.values())
  }, [selectionState.selectedItems])

  const getMinimalSelectedItems = useCallback(() => {
    const allSelected = Array.from(selectionState.selectedItems.values())

    // Filter out items whose parent folder is already selected
    return allSelected.filter((item) => {
      // Check if any ancestor of this item is also selected
      const hasSelectedAncestor = (currentItem: FileItem): boolean => {
        if (!currentItem.parentId) return false

        // Check if direct parent is selected
        if (selectedIds.has(currentItem.parentId)) {
          return true
        }

        // Recursively check ancestors by finding the parent in selected items
        const parentItem = allSelected.find(
          (p) => p.resource_id === currentItem.parentId,
        )
        if (parentItem) {
          return hasSelectedAncestor(parentItem)
        }

        return false
      }

      return !hasSelectedAncestor(item)
    })
  }, [selectionState.selectedItems, selectedIds])

  const getSelectionSummary = useCallback(() => {
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

      if (selectedIds.has(folder.resource_id)) {
        return false // Fully selected, not indeterminate
      }

      // Filter children to only include direct children of this specific folder
      const validChildren = children.filter(
        (child) => child.parentId === folder.resource_id,
      )

      // Check if any selected item is a direct or indirect descendant of this folder
      const hasSelectedDescendants = Array.from(
        selectionState.selectedItems.values(),
      ).some((item) => {
        if (item.resource_id === folder.resource_id) return false

        // Check if item is a direct child
        if (item.parentId === folder.resource_id) return true

        // Check if item is an indirect descendant by finding its parent chain
        // This handles nested selections without path manipulation
        let currentItem = item
        while (currentItem.parentId) {
          const parent = Array.from(selectionState.selectedItems.values()).find(
            (p) => p.resource_id === currentItem.parentId,
          )
          if (!parent) break

          if (parent.resource_id === folder.resource_id) return true
          currentItem = parent
        }
        return false
      })

      if (!hasSelectedDescendants) {
        return false // No descendants selected
      }

      // Has at least one descendant selected
      // If we have children data, check if all direct children are selected
      if (validChildren.length > 0) {
        const allDirectChildrenSelected = validChildren.every((child) =>
          selectedIds.has(child.resource_id),
        )
        return !allDirectChildrenSelected // Indeterminate if not all direct children selected
      }

      // No children data (collapsed), but has descendants selected
      return true
    },
    [selectedIds, selectionState.selectedItems],
  )

  const contextValue: SelectionContextType = useMemo(
    () => ({
      ...selectionState,
      selectedIds, // Add computed selectedIds for backward compatibility
      folderSelectionIntent: selectedFolders, // Add computed folderSelectionIntent
      toggleSelection,
      toggleFolderSelection,
      selectAll,
      clearSelection,
      isSelected,
      isIndeterminate,
      getSelectedItems,
      getMinimalSelectedItems,
      getSelectionSummary,
    }),
    [
      selectionState,
      selectedIds,
      selectedFolders,
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
