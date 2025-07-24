import { create } from "zustand"
import type { FileItem } from "@/lib/types"

interface SelectionStore {
  selectedItems: Map<string, FileItem>

  toggleSelection: (item: FileItem) => void
  toggleFolderSelection: (folder: FileItem, children?: FileItem[]) => void
  selectAll: (items: FileItem[]) => void
  clearSelection: () => void

  isSelected: (itemId: string) => boolean
  isIndeterminate: (folder: FileItem, children?: FileItem[]) => boolean
  getMinimalSelectedItems: () => FileItem[]
  getSelectionSummary: () => { count: number; totalSize: number }
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedItems: new Map<string, FileItem>(),

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

  selectAll: (items: FileItem[]) => {
    set((state) => {
      const newSelectedItems = new Map(state.selectedItems)

      items.forEach((item) => {
        newSelectedItems.set(item.resource_id, item)
      })

      return { selectedItems: newSelectedItems }
    })
  },

  clearSelection: () => {
    set({ selectedItems: new Map<string, FileItem>() })
  },

  isSelected: (itemId: string) => {
    const state = get()
    return state.selectedItems.has(itemId)
  },

  isIndeterminate: (folder: FileItem, children: FileItem[] = []) => {
    const state = get()

    if (folder.inode_type !== "directory") {
      return false
    }

    if (state.selectedItems.has(folder.resource_id)) {
      return false
    }

    const validChildren = children.filter(
      (child) => child.parentId === folder.resource_id,
    )

    const hasSelectedDescendants = Array.from(
      state.selectedItems.values(),
    ).some((item) => {
      if (item.resource_id === folder.resource_id) return false

      if (item.parentId === folder.resource_id) return true

      let currentItem = item
      while (currentItem.parentId) {
        const parent = Array.from(state.selectedItems.values()).find(
          (p) => p.resource_id === currentItem.parentId,
        )
        if (!parent) break

        if (parent.resource_id === folder.resource_id) return true
        currentItem = parent
      }
      return false
    })

    if (!hasSelectedDescendants) {
      return false
    }

    if (validChildren.length > 0) {
      const allDirectChildrenSelected = validChildren.every((child) =>
        state.selectedItems.has(child.resource_id),
      )
      return !allDirectChildrenSelected
    }

    return true
  },

  getMinimalSelectedItems: () => {
    const state = get()
    const allSelected = Array.from(state.selectedItems.values())
    const selectedIds = new Set(state.selectedItems.keys())

    return allSelected.filter((item) => {
      const hasSelectedAncestor = (currentItem: FileItem): boolean => {
        if (!currentItem.parentId) return false

        if (selectedIds.has(currentItem.parentId)) {
          return true
        }

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
  },

  getSelectionSummary: () => {
    const state = get()
    const items = Array.from(state.selectedItems.values())
    const count = items.length
    const totalSize = items.reduce((sum, item) => {
      return sum + (item.dataloader_metadata?.size || 0)
    }, 0)

    return { count, totalSize }
  },
}))
