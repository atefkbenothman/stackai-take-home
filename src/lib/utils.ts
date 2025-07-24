import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FileItem } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string): string {
  if (!dateString) return ""
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) return ""
    
    // Format as very compact date (e.g., "12/15/23")
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    })
  } catch (error) {
    return ""
  }
}

export type SortOption = 'name' | 'date'

export function sortFiles(files: FileItem[], sortBy: SortOption): FileItem[] {
  return [...files].sort((a, b) => {
    // Always sort folders before files
    if (a.inode_type !== b.inode_type) {
      if (a.inode_type === 'directory') return -1
      if (b.inode_type === 'directory') return 1
    }
    
    // Within the same type (folder or file), sort by the specified option
    if (sortBy === 'name') {
      return a.inode_path.path.localeCompare(b.inode_path.path, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      })
    } else {
      // Sort by date - most recent first
      const dateA = new Date(a.modified_at).getTime()
      const dateB = new Date(b.modified_at).getTime()
      return dateB - dateA
    }
  })
}
