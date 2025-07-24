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

              // Note: For simplicity, we're not recursively fetching nested children here
              // In a production app, you might want to track the full tree structure
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
    (folderId: string, children: FileItem[] = []) => {
      if (selectionState.selectedIds.has(folderId)) {
        return false // Fully selected, not indeterminate
      }

      // Check if some (but not all) children are selected
      const selectedChildrenCount = children.filter((child) =>
        selectionState.selectedIds.has(child.resource_id),
      ).length

      return (
        selectedChildrenCount > 0 && selectedChildrenCount < children.length
      )
    },
    [selectionState.selectedIds],
  )

  const contextValue: SelectionContextType = useMemo(() => ({
    ...selectionState,
    toggleSelection,
    toggleFolderSelection,
    selectAll,
    clearSelection,
    isSelected,
    isIndeterminate,
    getSelectedItems,
    getSelectionSummary: () => getSelectionSummary,
  }), [
    selectionState,
    toggleSelection,
    toggleFolderSelection,
    selectAll,
    clearSelection,
    isSelected,
    isIndeterminate,
    getSelectedItems,
    getSelectionSummary,
  ])

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
