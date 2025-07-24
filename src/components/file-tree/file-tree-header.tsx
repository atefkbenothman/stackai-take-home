import { ArrowUpDown, Type, Calendar, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { SortOption } from "@/lib/utils"

interface FileTreeHeaderProps {
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
}

export function FileTreeHeader({ sortBy, onSortChange }: FileTreeHeaderProps) {
  return (
    <div className="flex h-10 items-center justify-between border-b bg-gray-200 p-2">
      <h2 className="text-sm font-semibold text-gray-700">File Picker</h2>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-gray-700 hover:bg-gray-300"
          >
            <ArrowUpDown size={14} className="mr-1" />
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem 
            className="cursor-pointer" 
            onClick={() => onSortChange('name')}
          >
            <Type size={14} className="mr-2" />
            Sort by Name
            {sortBy === 'name' && <Check size={14} className="ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => onSortChange('date')}
          >
            <Calendar size={14} className="mr-2" />
            Sort by Date
            {sortBy === 'date' && <Check size={14} className="ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
