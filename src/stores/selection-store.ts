import { create } from "zustand"
import type { QueryClient } from "@tanstack/react-query"
import type { FileItem } from "@/lib/types"
import { getAllCachedDescendants } from "@/lib/utils"

interface SelectionStore {
  selectedItems: Map<string, FileItem>
  pendingAutoSelection: Set<string> // Folders waiting for their children to be auto-selected

  toggleSelection: (item: FileItem) => void
  toggleFolderSelection: (folder: FileItem, children?: FileItem[]) => void
  toggleFolderSelectionRecursive: (
    folder: FileItem,
    queryClient: QueryClient,
  ) => void
  autoSelectNewlyFetchedChildren: (
    folderId: string,
    queryClient: QueryClient,
  ) => void
  clearSelection: () => void

  isSelected: (itemId: string) => boolean
  getMinimalSelectedItems: () => FileItem[]
  getSelectionSummary: () => { count: number; totalSize: number }
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedItems: new Map<string, FileItem>(),
  pendingAutoSelection: new Set<string>(),

  toggleSelection: (item: FileItem) => {
    set((state) => {
      const newSelectedItems = new Map(state.selectedItems)

      if (state.selectedItems.has(item.resource_id)) {
        newSelectedItems.delete(item.resource_id)
      } else {
        newSelectedItems.set(item.resource_id, item)
      }

      return { selectedItems: newSelectedItems }
    })
  },

  toggleFolderSelection: (folder: FileItem, children: FileItem[] = []) => {
    set((state) => {
      const newSelectedItems = new Map(state.selectedItems)
      const isCurrentlySelected = state.selectedItems.has(folder.resource_id)

      const validChildren = children.filter(
        (child) => child.parentId === folder.resource_id,
      )

      if (isCurrentlySelected) {
        // Deselect folder and all valid children
        newSelectedItems.delete(folder.resource_id)
        validChildren.forEach((child) => {
          newSelectedItems.delete(child.resource_id)
        })
      } else {
        // Select folder and all valid children
        newSelectedItems.set(folder.resource_id, folder)
        validChildren.forEach((child) => {
          newSelectedItems.set(child.resource_id, child)
        })
      }

      return { selectedItems: newSelectedItems }
    })
  },

  toggleFolderSelectionRecursive: (
    folder: FileItem,
    queryClient: QueryClient,
  ) => {
    set((state) => {
      const newSelectedItems = new Map(state.selectedItems)
      const newPendingAutoSelection = new Set(state.pendingAutoSelection)
      const isCurrentlySelected = state.selectedItems.has(folder.resource_id)

      // Get all cached descendants at any depth
      const allDescendants = getAllCachedDescendants(
        folder.resource_id,
        queryClient,
      )

      if (isCurrentlySelected) {
        // Deselect folder and all cached descendants
        newSelectedItems.delete(folder.resource_id)
        allDescendants.forEach((descendant) => {
          newSelectedItems.delete(descendant.resource_id)
        })
        // Remove from pending auto-selection
        newPendingAutoSelection.delete(folder.resource_id)
      } else {
        // Select folder and all cached descendants
        newSelectedItems.set(folder.resource_id, folder)
        allDescendants.forEach((descendant) => {
          newSelectedItems.set(descendant.resource_id, descendant)
        })

        // If folder has no cached descendants, mark for auto-selection when fetched
        if (allDescendants.length === 0) {
          newPendingAutoSelection.add(folder.resource_id)
        }
      }

      return {
        selectedItems: newSelectedItems,
        pendingAutoSelection: newPendingAutoSelection,
      }
    })
  },

  autoSelectNewlyFetchedChildren: (
    folderId: string,
    queryClient: QueryClient,
  ) => {
    set((state) => {
      // Only proceed if this folder is pending auto-selection
      if (!state.pendingAutoSelection.has(folderId)) {
        return state
      }

      const newSelectedItems = new Map(state.selectedItems)
      const newPendingAutoSelection = new Set(state.pendingAutoSelection)

      // Get all newly cached descendants
      const allDescendants = getAllCachedDescendants(folderId, queryClient)

      // Select all descendants
      allDescendants.forEach((descendant) => {
        newSelectedItems.set(descendant.resource_id, descendant)
      })

      // Remove from pending since we've processed it
      newPendingAutoSelection.delete(folderId)

      return {
        selectedItems: newSelectedItems,
        pendingAutoSelection: newPendingAutoSelection,
      }
    })
  },

  clearSelection: () => {
    set({
      selectedItems: new Map<string, FileItem>(),
      pendingAutoSelection: new Set<string>(),
    })
  },

  isSelected: (itemId: string) => {
    const state = get()
    return state.selectedItems.has(itemId)
  },

  getMinimalSelectedItems: () => {
    const state = get()
    // Cache both array conversion and Set creation once per method call
    const selectedItemsArray = Array.from(state.selectedItems.values())
    const selectedIds = new Set(state.selectedItems.keys())

    return selectedItemsArray.filter((item) => {
      const hasSelectedAncestor = (currentItem: FileItem): boolean => {
        if (!currentItem.parentId) return false

        if (selectedIds.has(currentItem.parentId)) {
          return true
        }

        const parentItem = selectedItemsArray.find(
          (p) => p.resource_id === currentItem.parentId,
        )
        if (parentItem) {
          return hasSelectedAncestor(parentItem)
        }

        return false
      }

      return !hasSelectedAncestor(item)
    })
  },

  getSelectionSummary: () => {
    const state = get()
    // Cache the array conversion once per method call
    const selectedItemsArray = Array.from(state.selectedItems.values())
    const count = selectedItemsArray.length
    const totalSize = selectedItemsArray.reduce((sum, item) => {
      return sum + (item.dataloader_metadata?.size || 0)
    }, 0)

    return { count, totalSize }
  },
}))
